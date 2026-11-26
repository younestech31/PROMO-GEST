#!/usr/bin/env bash
# run-acceptance.sh — مشغّل القبول اليدوي للمرحلة صفر (P0-A01 و P0-A04) عبر الملفات الأربعة.
#
# يغلّف حزمة phase0-manual الرسمية (start-session.sh) دون تعديلها:
#   * يتحقق من البيئة (Linux x86-64، Docker Engine محلي عبر unix socket، python3، openssl، curl)
#     ومن مطابقة BUILD_SHA للحزمة مع نسخة القبول المعتمدة d67eb56302a9df1961ecf220356c1967497c4e76.
#   * يشغّل جلسة معزولة لكل ملف (ar-desktop / fr-desktop / ar-mobile / fr-mobile)، قاعدة PostgreSQL 18
#     مؤقتة جديدة في كل مرة، ويعرض مخرجات الحزمة مباشرة في الطرفية نفسها.
#   * يسجّل أعداد قاعدة البيانات فعلياً عند كل نقطة (counts) ويقارنها بالمتحقق (0|0|0 ثم 1|1|1).
#   * ينفّذ فحصي HTTP المحليين الذي يسمح بهما البروتوكول كعميل مستقل على جهاز المُختبِر:
#       - إعادة إرسال طلب تهيئة صالح → المتوقع 409 SETUP_ALREADY_INITIALIZED.
#       - إعادة تشغيل جلسة ما قبل الخروج (كوكي) → 200 قبل الخروج ثم 401 بعده؛ دون طباعة القيمة أو حفظها.
#   * يسأل المُختبِر أسئلة مشاهدة محددة لكل خطوة، ويحسب الحالة المقترحة فقط:
#     PASS لا يُقترح إلا عند تأكيد كل الخطوات المطلوبة. لا يعلن PASS من تلقاء نفسه ولا يعدّل مستندات القبول.
#   * ينسخ اللقطات إلى مجلد الأدلة مع SHA-256، ثم يبني محضراً عربياً + results.json جاهزين للتسجيل الحرفي.
#
# الخصوصية: لا يُطبع ولا يُحفظ أي كوكي أو رمز أو كلمة مرور في المحضر أو الأدلة؛ ملف قيمة الجلسة المؤقت
# يُحذف فور انتهاء كل جلسة. استخدم بيانات وهمية فقط.
#
# الاستخدام:
#   bash run-acceptance.sh --kit /path/to/phase0-manual [--out DIR] [--redo PROFILE]
#   bash run-acceptance.sh --assemble --out DIR            # إعادة توليد المحضر من الجلسات المسجلة
#   bash run-acceptance.sh --probe-url URL [--probe-cookie STR]   # اختبار فحوص HTTP على خادم اختباري
#
# الحزمة الرسمية: مرفق phase0-manual-linux-x64 من تشغيل CI لنفس SHA القبول:
#   https://github.com/younestech31/PROMO-GEST/actions/runs/45571918608/artifacts/15002372284
# (احتفاظ GitHub 14 يوماً حتى 2026-12-09 تقريباً؛ بعد انتهائه أعد تشغيل الـ workflow على نفس SHA.)

set -euo pipefail
umask 077

EXPECTED_SHA='d67eb56302a9df1961ecf220356c1967497c4e76'
CI_RUN_URL='https://github.com/younestech31/PROMO-GEST/actions/runs/45571918608'
PROFILES='ar-desktop fr-desktop ar-mobile fr-mobile'

KIT=''; OUT=''; MODE='full'; REDO=''
PROFILE=''; LOG=''; KIT_PID=''; TAIL_PID=''; URL=''; PORT=''
COUNTS_PRE=''; COUNTS_POST=''; COUNTS_FINAL=''
COOKIE_FILE=''

sep() { printf '\n──────────────────────────────────────────────────────────\n'; }
die() { printf 'خطأ: %s\n' "$1" >&2; exit 2; }
warn() { printf 'تنبيه: %s\n' "$1" >&2; }

profile_label() {
  case $1 in
    ar-desktop) echo 'العربية RTL — 1440×900';;
    fr-desktop) echo 'الفرنسية LTR — 1440×900';;
    ar-mobile)  echo 'العربية RTL — 390×844';;
    fr-mobile)  echo 'الفرنسية LTR — 390×844';;
    *) die 'ملف غير معروف';;
  esac
}
profile_lang() {
  case $1 in ar-*) echo 'العربية (ar)';; fr-*) echo 'Français (fr)';; esac
}
profile_view() {
  case $1 in
    *-desktop) echo 'نافذة متصفح بمقاس 1440×900';;
    *-mobile)  echo 'وضع الجهاز في أدوات المطوّر بمقاس 390×844 (iPhone 12/13 Pro أو مقاس مخصص)';;
  esac
}

ask_text() { # $1 prompt, $2 outvar
  local a
  while :; do
    printf '%s ' "$1"
    IFS= read -r a || die 'انتهى الإدخال.'
    [[ -n $a ]] || { echo 'أدخل قيمة غير فارغة.'; continue; }
    printf -v "$2" '%s' "$a"; return 0
  done
}

ask_yn() { # $1 prompt, $2 outvar → yes | no | skip (يرجع 0 دائماً)
  local a
  while :; do
    printf '%s [y=نعم / n=لا / s=لم يُنفَّذ] ' "$1"
    IFS= read -r a || die 'انتهى الإدخال.'
    case $a in
      y|Y|نعم) printf -v "$2" 'yes';  return 0;;
      n|N|لا)  printf -v "$2" 'no';   return 0;;
      s|S)     printf -v "$2" 'skip'; return 0;;
      *) echo 'أجب بـ y أو n أو s.';;
    esac
  done
}

all_yes() { local v; for v in "$@"; do [[ ${!v-} == yes ]] || return 1; done; }

json_write() { # $1 file, rest: key value pairs
  python3 - "$@" <<'PY'
import json, sys
path, pairs = sys.argv[1], sys.argv[2:]
try:
    d = json.load(open(path))
except Exception:
    d = {}
it = iter(pairs)
for k, v in zip(it, it):
    d[k] = v
json.dump(d, open(path, 'w'), ensure_ascii=False, indent=1)
PY
}

wait_log() { # $1 pattern, $2 timeout seconds
  local pat=$1 t=$2 i=0
  while :; do
    if grep -qE "$pat" "$LOG" 2>/dev/null; then return 0; fi
    if ! kill -0 "$KIT_PID" 2>/dev/null; then
      die "انتهت عملية الحزمة مبكراً دون الجاهزية؛ راجع السجل: $LOG"
    fi
    if [[ $i -ge $t ]]; then return 1; fi
    sleep 1
    i=$((i+1))
  done
}

kit_cmd() { printf '%s\n' "$1" >&3; }

counts_query() { # يرسل counts للحزمة ويلتقط السطر الجديد
  local before after i
  before=$(grep -cE '^Counts: ' "$LOG" 2>/dev/null || true)
  kit_cmd counts
  i=0
  while :; do
    after=$(grep -cE '^Counts: ' "$LOG" 2>/dev/null || true)
    if [[ $after -gt $before ]]; then break; fi
    if ! kill -0 "$KIT_PID" 2>/dev/null; then
      die 'انتهت عملية الحزمة أثناء قراءة الأعداد.'
    fi
    if [[ $i -ge 30 ]]; then die 'لم يصل سطر الأعداد خلال 30 ثانية.'; fi
    sleep 0.5
    i=$((i+1))
  done
  grep -E '^Counts: ' "$LOG" | tail -1 | sed 's/^Counts: //'
}

counts_ok() { [[ $1 == '1|1|1' || $1 == '0|0|0' ]] || [[ $1 == "$2" ]]; }

# فحص إعادة التهيئة: عميل مستقل على جهاز المُختبِر. المتوقع 409 SETUP_ALREADY_INITIALIZED.
repeat_setup_probe() { # $1 base URL
  python3 - "$1" <<'PY'
import http.client, json, sys
from urllib.parse import urlparse
u = urlparse(sys.argv[1])
c = http.client.HTTPConnection(u.hostname, u.port, timeout=15)
c.request('GET', '/api/setup/status')
r = c.getresponse()
s = json.load(r)
if s.get('isInitialized') is not True:
    sys.exit('الجلسة غير مهيأة؛ أُلغي الفحص ولم يُرسل أي POST.')
c.request('GET', '/api/auth/csrf')
r = c.getresponse()
if r.status != 200:
    sys.exit(f'فشل CSRF ({r.status})؛ أُلغي الفحص.')
csrf = json.load(r)
cookies = [v.split(';')[0] for k, v in r.getheaders() if k.lower() == 'set-cookie']
payload = dict(legalName='QA Repeat Only', legalForm='SARL', wilayaCode='31',
               wilayaName='Oran', address='QA repeat-test address', defaultLanguage='ar',
               adminUsername='qa_repeat_probe', adminFullName='QA Repeat Probe',
               adminEmail='qa-repeat@example.invalid',
               adminPassword='Qa9!' + 'x' * 20)
c.request('POST', '/api/setup/initialize', json.dumps(payload), {
    'Content-Type': 'application/json', csrf['headerName']: csrf['token'],
    'Cookie': '; '.join(cookies)})
r = c.getresponse()
raw = r.read().decode('utf-8', 'replace')
try:
    code = json.loads(raw).get('code', '')
except Exception:
    code = ''
print(f'RESULT: HTTP {r.status} {code}')
PY
}

# فحص العميل المستقل لجلسة ما قبل الخروج. لا يطبع قيمة الكوكي إطلاقاً.
replay_probe() { # $1 base URL, $2 cookie file
  python3 - "$1" "$2" <<'PY'
import http.client, sys
from urllib.parse import urlparse
u = urlparse(sys.argv[1])
cookie = open(sys.argv[2]).read().strip()
c = http.client.HTTPConnection(u.hostname, u.port, timeout=15)
c.request('GET', '/api/auth/me', headers={'Cookie': cookie})
r = c.getresponse()
r.read()
print(f'RESULT: HTTP {r.status}')
PY
}

save_screenshot() { # $1 evidence name, $2 prompt
  local p sha
  printf '%s ' "$2 (مسار الملف، أو Enter للتخطي):"
  IFS= read -r p || die 'انتهى الإدخال أثناء سؤال لقطة الشاشة.'
  if [[ -z $p ]]; then
    echo 'تخطيت اللقطة الاختيارية — ستُسجّل الجلسة مع بيان غيابها.'
    return 0
  fi
  if [[ ! -s $p ]]; then warn "الملف غير موجود أو فارغ: $p — تم التخطي."; return 0; fi
  cp -- "$p" "$OUT/evidence/$1"
  sha=$(sha256sum "$OUT/evidence/$1" | cut -d' ' -f1)
  echo "محفوظة: evidence/$1 (sha256 $sha)"
  SCREENSHOT_REFS+=("$1:$sha")
}

preflight() {
  [[ $(uname -sm) == 'Linux x86_64' ]] || die 'الحزمة الرسمية مبنية لملف Linux x86-64 فقط.'
  local t
  for t in docker python3 openssl curl; do
    command -v "$t" >/dev/null 2>&1 || die "أداة مفقودة: $t — ثبّتها ثم أعد التشغيل."
  done
  local endpoint
  endpoint=$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null) \
    || die 'تعذر قراءة سياق Docker. تأكد أن Docker Engine يعمل.'
  [[ $endpoint == unix://* ]] || die 'يجب أن يكون Docker Engine محلياً عبر unix socket (كما يشترط start-session.sh).'
  [[ -x $KIT/api/PromoGest.Api ]] || die "الحزمة غير مكتملة: $KIT/api/PromoGest.Api غير موجود/غير تنفيذي."
  [[ -s $KIT/api/wwwroot/index.html ]] || die "الحزمة غير مكتملة: $KIT/api/wwwroot/index.html مفقود."
  [[ -f $KIT/BUILD_SHA ]] || die "الحزمة غير مكتملة: BUILD_SHA مفقود."
  [[ -x $KIT/start-session.sh || -f $KIT/start-session.sh ]] || die "الحزمة غير مكتملة: start-session.sh مفقود."
  local kit_sha
  kit_sha=$(tr -d ' \t\n\r' < "$KIT/BUILD_SHA")
  if [[ $kit_sha != "$EXPECTED_SHA" ]]; then
    die "BUILD_SHA للحزمة ($kit_sha) لا يطابق نسخة القبول المعتمدة ($EXPECTED_SHA).
نزّل المرفق phase0-manual-linux-x64 من تشغيل CI على نفس النسخة: $CI_RUN_URL"
  fi
  local leftovers
  leftovers=$(docker ps -aq --filter label=promogest.role=manual-p0 2>/dev/null || true)
  if [[ -n $leftovers ]]; then
    die "توجد حاويات جلسات سابقة لا تزال تعمل:
$leftovers
أغلقها أولاً: docker rm -fv \$(docker ps -aq --filter label=promogest.role=manual-p0)"
  fi
}

collect_metadata() {
  sep
  echo 'بيانات المُختبِر (تُسجَّل في المحضر):'
  ask_text 'اسم/أحرف المُختبِر:' TESTER
  ask_text 'المتصفح والإصدار (مثال: Chrome 141):' BROWSER
  OS_DESC=$(uname -sr)
  json_write "$OUT/metadata.json" \
    tester "$TESTER" browser "$BROWSER" os "$OS_DESC" \
    expected_sha "$EXPECTED_SHA" ci_run "$CI_RUN_URL" \
    protocol 'docs/PHASE-0-MANUAL-ACCEPTANCE.md §4/§5A + docs/PHASE-0-OPERATOR-CHECKLIST.ar.md'
}

cleanup_session() {
  if [[ -n ${TAIL_PID-} ]]; then kill "$TAIL_PID" 2>/dev/null || true; fi
  if [[ -n ${KIT_PID-} ]]; then
    if kill -0 "$KIT_PID" 2>/dev/null; then
      printf 'quit\n' >&3 2>/dev/null || true
      sleep 3
      kill "$KIT_PID" 2>/dev/null || true
    fi
    wait "$KIT_PID" 2>/dev/null || true
  fi
  exec 3>&- 2>/dev/null || true
  [[ -n ${FIFO-} ]] && rm -f -- "$FIFO"
  [[ -n ${COOKIE_FILE-} ]] && rm -f -- "$COOKIE_FILE"
  if command -v docker >/dev/null 2>&1; then
    local leftovers
    leftovers=$(docker ps -aq --filter label=promogest.role=manual-p0 2>/dev/null || true)
    if [[ -n $leftovers ]]; then
      warn "حاويات لم تُدمر: $leftovers
نظّفها بـ: docker rm -fv $leftovers"
    fi
  fi
}

status_decision() { # $1 case id (A01/A04), $2 suggested, rest: required vars
  local case_id=$1 suggested=$2; shift 2
  local note='' choice
  if [[ $suggested == PASS ]]; then
    echo "المقترح لـ $case_id: PASS (كل الخطوات مؤكدة)."
    printf 'تسجيل PASS؟ [y/n] '
    read -r choice
    if [[ $choice == y || $choice == Y || $choice == نعم ]]; then
      STATUS=$suggested; NOTE='كل الخطوات مؤكدة من المُختبِر.'; return 0
    fi
  else
    echo "لا يمكن اقتراح PASS لـ $case_id (خطوة مرفوضة أو لم تُنفَّذ أو الأعداد غير مطابقة)."
  fi
  while :; do
    ask_text "سجّل $case_id يدوياً (PASS/FAIL/BLOCKED): (لا يُسمح بـ PASS إلا إذا كانت كل الخطوات مؤكدة)" choice
    case $choice in
      PASS) if [[ $suggested == PASS ]]; then STATUS=PASS; break; fi
            echo 'الشروط لا تسمح بـ PASS — اختر FAIL أو BLOCKED أو صحّح الخطوات بإعادة الجلسة.';;
      FAIL|BLOCKED) STATUS=$choice; break;;
      *) echo 'أدخل PASS أو FAIL أو BLOCKED.';;
    esac
  done
  ask_text 'سبب/ملاحظة قصيرة (تُسجَّل في المحضر):' note
  NOTE=$note
}

run_session() { # $1 profile
  PROFILE=$1
  local sessdir="$OUT/sessions" logdir="$OUT/logs"
  mkdir -p "$sessdir" "$logdir" "$OUT/evidence"
  LOG="$logdir/$PROFILE.log"
  FIFO="$sessdir/$PROFILE.fifo"
  COOKIE_FILE="$sessdir/$PROFILE.cookie.tmp"
  SCREENSHOT_REFS=()
  : > "$LOG"

  sep; sep
  echo "الجلسة: $PROFILE — $(profile_label "$PROFILE")"
  echo "لغة الواجهة المطلوبة: $(profile_lang "$PROFILE") | المقاس: $(profile_view "$PROFILE")"
  sep

  mkfifo "$FIFO"
  bash "$KIT/start-session.sh" "$PROFILE" <"$FIFO" >"$LOG" 2>&1 &
  KIT_PID=$!
  exec 3>"$FIFO"   # يلتقي مع فتح الطرف القرائي في عملية الحزمة
  tail -n +1 -f "$LOG" &
  TAIL_PID=$!

  echo "في انتظار جاهزية الجلسة (أول تشغيل ينزّل postgres:18-alpine وقد يستغرق دقائق)..."
  if ! wait_log '^\s*Open on this machine: http://127\.0\.0\.1:[0-9]+' 420; then
    die 'لم تصبح الجلسة جاهزة خلال المهلة. راجع السجل ثم أعد الجلسة.'
  fi
  URL=$(grep -oE 'http://127\.0\.0\.1:[0-9]+' "$LOG" | head -1)
  PORT=${URL##*:}
  KIT_BUILD=$(grep -oE 'build: [0-9a-f]{40}' "$LOG" | head -1 | cut -d' ' -f2)
  SESSION_TS=$(date -Is)
  echo
  echo "الجلسة جاهزة. افتح في المتصفح: $URL"
  echo "BUILD_SHA كما تعلنه الحزمة: $KIT_BUILD"
  echo "أبقِ هذه الطرفية كما هي؛ مخرجات الحزمة تظهر أعلاه."

  # ---------- P0-A01 ----------
  sep
  echo 'P0-A01 — الخطوة 1: تجهيز المتصفح والتحقق من خلو القاعدة'
  echo 'افتح نافذة خاصة/متصفح جديدة نظيفة تماماً (أغلق جميع النوافذ الخاصة المتبقية عن الجلسات السابقة).'
  echo "اختر لغة $(profile_lang "$PROFILE") في المعالج واضبط المقاس: $(profile_view "$PROFILE")."
  ask_yn 'هل فتحت الرابط أعلاه في نافذة نظيفة بالمقاس واللغة المطلوبين؟' v_browser_ready

  COUNTS_PRE=$(counts_query)
  echo "الأعداد قبل التهيئة (فعلي): $COUNTS_PRE (المتوقع: 0|0|0)"
  COUNTS_PRE_OK=no
  [[ $COUNTS_PRE == '0|0|0' ]] && COUNTS_PRE_OK=yes

  echo
  echo 'P0-A01 — الخطوة 2: المعالج الأول'
  echo 'أكمل معالج التهيئة ببيانات وهمية فقط: مؤسسة اختبار ومدير اختبار (أسماء وأرقام وهمية، بريد example.invalid).'
  ask_yn 'هل نجح حفظ التهيئة وظهر إشعار الإتمام؟' v_wizard_saved
  ask_yn 'هل انتقلت إلى شاشة الدخول العادية مع اسم المؤسسة وإشعار الإتمام بلغة الجلسة (دون جلسة مسجلة تلقائياً)؟' v_login_screen
  ask_yn 'تأكدت أن لم تُفتح جلسة مدير مسجلة تلقائياً بعد المعالج؟' v_no_auto_session

  echo
  echo "P0-A01 — الخطوة 3: فحص الجلسة قبل الدخول"
  echo "من شريط العنوان أو من Network في أدوات المطوّر: افتح $URL/api/auth/me — المتوقع 401."
  ask_yn 'هل أعاد /api/auth/me الحالة 401 قبل أي تسجيل دخول؟' v_me401_prelogin

  echo
  echo 'P0-A01 — الخطوة 4: منع التكرار (فحص عميل مستقل محلي)'
  echo 'يُرسل الآن طلب تهيئة صالح ثانٍ من هذا الجهاز عبر فحص محلي؛ المتوقع 409 SETUP_ALREADY_INITIALIZED.'
  REPEAT_RESULT=$(repeat_setup_probe "$URL" | tail -1)
  echo "نتيجة إعادة التهيئة: $REPEAT_RESULT"
  REPEAT_OK=no
  [[ $REPEAT_RESULT == 'RESULT: HTTP 409 SETUP_ALREADY_INITIALIZED' ]] && REPEAT_OK=yes

  COUNTS_POST=$(counts_query)
  echo "الأعداد بعد المحاولة الثانية (فعلي): $COUNTS_POST (المتوقع: 1|1|1 — لا تكرار)"
  COUNTS_POST_OK=no
  [[ $COUNTS_POST == '1|1|1' ]] && COUNTS_POST_OK=yes

  echo
  echo 'P0-A01 — الخطوة 5: الدخول الصريح'
  echo 'سجّل الدخول صراحةً بحساب المدير الذي أنشأته في المعالج.'
  ask_yn 'هل نجح الدخول وتحمّلت الواجهة المصادَقة؟' v_login_ok
  save_screenshot "01-$PROFILE-setup-login-screen.png" 'لقطة شاشة الدخول بعد التهيئة (اختياري لكنه مطلوب للأدلة)'

  local a01_vars=(v_wizard_saved v_login_screen v_no_auto_session v_me401_prelogin v_login_ok)
  local a01_suggest='NOT_ALL'
  if all_yes "${a01_vars[@]}" && [[ $COUNTS_PRE_OK == yes && $REPEAT_OK == yes && $COUNTS_POST_OK == yes ]]; then
    a01_suggest='PASS'
  fi
  STATUS=''; NOTE=''
  status_decision 'P0-A01' "$a01_suggest" "${a01_vars[@]}"
  A01_STATUS=$STATUS; A01_NOTE=$NOTE

  # ---------- P0-A04 ----------
  sep
  echo 'P0-A04 — الخطوة 1: التقاط جلسة للفحص المستقل (قبل أي خروج)'
  echo 'من أدوات المطوّر → Application → Cookies: انسخ زوج الاسم=قيمة لكوكي جلسة الدخول'
  echo '(مثال شائع: .AspNetCore.Cookies=...) — الإدخال مخفي، لن يُطبع ولا يُحفظ في المحضر، ويُحذف فور انتهاء الجلسة.'
  printf 'الصق الكوكي ثم اضغط Enter: '
  IFS= read -rs COOKIE_VALUE
  printf '%s' "$COOKIE_VALUE" > "$COOKIE_FILE"
  unset COOKIE_VALUE
  if [[ ! -s $COOKIE_FILE ]]; then
    warn 'لم تُلتقط قيمة الجلسة؛ سيُسجَّل فحص إعادة التشغيل كخطوة متبقية.'
    REPLAY_PRE='SKIPPED'; REPLAY_POST='SKIPPED'; REPLAY_PRE_OK=no; REPLAY_POST_OK=no
  else
    REPLAY_PRE=$(replay_probe "$URL" "$COOKIE_FILE" | tail -1)
    echo "العميل المستقل قبل الخروج: $REPLAY_PRE (المتوقع: HTTP 200 — يثبت صحة الالتقاط)"
    REPLAY_PRE_OK=no
    [[ $REPLAY_PRE == 'RESULT: HTTP 200' ]] && REPLAY_PRE_OK=yes
    if [[ $REPLAY_PRE_OK == no ]]; then
      warn 'الالتقاط غير صحيح (ليس 200). راجع زوج الاسم=قيمة. سيُسجَّل كخطوة متبقية.'
    fi
  fi

  echo
  echo 'P0-A04 — الخطوة 2: الخروج غير المؤكد (حجب الطلب)'
  echo 'من أدوات المطوّر → Network → Request blocking: أضف نمط حجب يحوي auth/logout ثم اضغط «خروج» في الواجهة.'
  ask_yn 'هل ظلت الواجهة المصادَقة ظاهرة بعد فشل/انقطاع طلب الخروج؟' v_blocked_persist
  ask_yn 'هل ظهر تحذير بلغة الجلسة أن الخروج غير مؤكد مع زر إعادة المحاولة؟' v_warning_shown
  echo "تحقق الآن: $URL/api/auth/me — المتوقع 200 (الجلسة باقية)."
  ask_yn 'هل أعاد /api/auth/me الحالة 200 أثناء الحجب؟' v_me200_blocked

  echo
  echo 'P0-A04 — الخطوة 3: الخروج المؤكد (إعادة المحاولة)'
  echo 'أزل الحجب (unblock) واضغط «إعادة المحاولة».'
  ask_yn 'هل ظهر 204 وعادت شاشة الدخول؟' v_retry204

  echo
  echo 'P0-A04 — الخطوة 4: المسار المحمي بعد الخروج'
  echo 'أعد فتح /admin/users وحدّث الصفحة (F5).'
  ask_yn 'هل عادت شاشة الدخول دون أي محتوى محمي؟' v_protected_login
  echo "تحقق: $URL/api/auth/me — المتوقع 401."
  ask_yn 'هل أعاد /api/auth/me الحالة 401 بعد الخروج؟' v_me401_after

  if [[ ${REPLAY_PRE_OK:-no} == yes ]]; then
    REPLAY_POST=$(replay_probe "$URL" "$COOKIE_FILE" | tail -1)
    echo "العميل المستقل بعد الخروج (نفس الجلسة القديمة): $REPLAY_POST (المتوقع: HTTP 401)"
    REPLAY_POST_OK=no
    [[ $REPLAY_POST == 'RESULT: HTTP 401' ]] && REPLAY_POST_OK=yes
  fi
  rm -f -- "$COOKIE_FILE"

  COUNTS_FINAL=$(counts_query)
  echo "الأعداد بعد الخروج (فعلي): $COUNTS_FINAL (المتوقع: 1|1|1)"
  COUNTS_FINAL_OK=no
  [[ $COUNTS_FINAL == '1|1|1' ]] && COUNTS_FINAL_OK=yes

  save_screenshot "02-$PROFILE-logout-blocked-warning.png" 'لقطة تحذير الخروج غير المؤكد (اختياري لكنه مطلوب للأدلة)'
  save_screenshot "03-$PROFILE-after-retry-login.png" 'لقطة ما بعد إعادة المحاولة/عودة شاشة الدخول (اختياري لكنه مطلوب للأدلة)'
  save_screenshot "04-$PROFILE-protected-route-login.png" 'لقطة عودة المسار المحمي إلى شاشة الدخول (اختياري لكنه مطلوب للأدلة)'

  local a04_vars=(v_blocked_persist v_warning_shown v_me200_blocked v_retry204 v_protected_login v_me401_after)
  local a04_suggest='NOT_ALL'
  if all_yes "${a04_vars[@]}" && [[ $REPLAY_PRE_OK == yes && $REPLAY_POST_OK == yes && $COUNTS_FINAL_OK == yes ]]; then
    a04_suggest='PASS'
  fi
  STATUS=''; NOTE=''
  status_decision 'P0-A04' "$a04_suggest" "${a04_vars[@]}"
  A04_STATUS=$STATUS; A04_NOTE=$NOTE

  # ---------- إنهاء الجلسة والتدمير ----------
  sep
  echo 'إنهاء الجلسة: سيُرسل quit للحزمة لتدمير حاوية القاعدة وبياناتها نهائياً.'
  SESSION_END_TS=$(date -Is)
  kit_cmd quit
  local i=0
  while kill -0 "$KIT_PID" 2>/dev/null; do
    if [[ $i -ge 30 ]]; then warn 'الحزمة لم تخرج بسهولة؛ سيُرسل إيقاف.'; kill "$KIT_PID" 2>/dev/null || true; break; fi
    sleep 1; i=$((i+1))
  done
  wait "$KIT_PID" 2>/dev/null || true
  KIT_PID=''
  kill "$TAIL_PID" 2>/dev/null || true; TAIL_PID=''
  exec 3>&- 2>/dev/null || true
  rm -f -- "$FIFO"
  rm -f -- "$COOKIE_FILE"

  # كتابة حالة الجلسة
  local args=()
  args+=(profile "$PROFILE" label "$(profile_label "$PROFILE")" started "$SESSION_TS" ended "$SESSION_END_TS")
  args+=(kit_build "$KIT_BUILD" url_port "$PORT")
  args+=(counts_pre "$COUNTS_PRE" counts_pre_ok "$COUNTS_PRE_OK")
  args+=(repeat_setup "$REPEAT_RESULT" repeat_ok "$REPEAT_OK")
  args+=(counts_post "$COUNTS_POST" counts_post_ok "$COUNTS_POST_OK")
  args+=(replay_pre "${REPLAY_PRE:-SKIPPED}" replay_pre_ok "${REPLAY_PRE_OK:-no}")
  args+=(replay_post "${REPLAY_POST:-SKIPPED}" replay_post_ok "${REPLAY_POST_OK:-no}")
  args+=(counts_final "$COUNTS_FINAL" counts_final_ok "$COUNTS_FINAL_OK")
  args+=(a01_status "$A01_STATUS" a01_note "$A01_NOTE")
  args+=(a04_status "$A04_STATUS" a04_note "$A04_NOTE")
  args+=(browser_ready "${v_browser_ready-}")
  for v in "${a01_vars[@]}"; do args+=("$v" "${!v-}"); done
  for v in "${a04_vars[@]}"; do args+=("$v" "${!v-}"); done
  local refs=()
  for r in "${SCREENSHOT_REFS[@]:-}"; do [[ -n $r ]] && refs+=("$r"); done
  if [[ ${#refs[@]} -gt 0 ]]; then args+=(evidence "$(printf '%s,' "${refs[@]}" | sed 's/,$//')"); fi
  json_write "$sessdir/$PROFILE.json" "${args[@]}"
  echo "سُجلت الجلسة: sessions/$PROFILE.json"
}

assemble() {
  [[ -f $OUT/metadata.json ]] || die 'لا يوجد metadata.json — شغّل الجلسات أولاً.'
  python3 - "$OUT" <<'PY'
import glob, hashlib, json, os, sys

out = sys.argv[1]
meta = json.load(open(os.path.join(out, 'metadata.json')))
order = ['ar-desktop', 'fr-desktop', 'ar-mobile', 'fr-mobile']
sessions = {}
for p in glob.glob(os.path.join(out, 'sessions', '*.json')):
    d = json.load(open(p))
    sessions[d['profile']] = d

def cell(s, key):
    if s is None:
        return 'NOT_RUN'
    return s.get(key, 'NOT_RUN')

lines = []
w = lines.append
w('# محضر القبول اليدوي — Phase 0: P0-A01 و P0-A04')
w('')
w(f"**تاريخ التوليد:** {meta.get('generated', '')}")
w(f"**المُختبِر (تنفيذ يدوي شخصي):** {meta.get('tester', '')} — المتصفح: {meta.get('browser', '')} — نظام التشغيل: {meta.get('os', '')}")
w(f"**الحزمة:** phase0-manual-linux-x64 — BUILD_SHA المطلوب `{meta.get('expected_sha', '')}` — من [تشغيل CI]({meta.get('ci_run', '')})")
w(f"**البروتوكول:** {meta.get('protocol', '')}")
w('')
w('## سجل الملفات الأربعة')
w('')
w('| اللغة والمقاس | P0-A01 | P0-A04 | مرجع الأدلة / الملاحظات |')
w('|---|---|---|---|')
any_session = False
for prof in order:
    s = sessions.get(prof)
    if s is None:
        w(f"| {prof} | NOT_RUN | NOT_RUN | لم تُنفَّذ هذه الجلسة |")
        continue
    any_session = True
    ev = s.get('evidence', '')
    names = [x.split(':')[0] for x in ev.split(',') if x]
    note = '؛ '.join(x for x in [s.get('a01_note', ''), s.get('a04_note', '')] if x and x != 'كل الخطوات مؤكدة من المُختبِر.')
    parts = ([', '.join(names)] if names else []) + ([note] if note else [])
    w(f"| {s.get('label', prof)} | {s.get('a01_status', 'NOT_RUN')} | {s.get('a04_status', 'NOT_RUN')} | {' — '.join(parts) if parts else '—'} |")
w('')
if not any_session:
    w('لم تُسجَّل أي جلسة بعد.')
    w('')
w('## تفاصيل كل جلسة منفّذة')
w('')
for prof in order:
    s = sessions.get(prof)
    if s is None:
        continue
    w(f"### {prof} — {s.get('label', '')}")
    w('')
    w(f"- البداية/النهاية: {s.get('started', '')} → {s.get('ended', '')} — منفذ التطبيق: 127.0.0.1:{s.get('url_port', '')}")
    w(f"- BUILD_SHA كما تعلنه الحزمة: `{s.get('kit_build', '')}`")
    w(f"- الأعداد قبل التهيئة: {s.get('counts_pre', '')} (متوقع 0|0|0) — مطابقة: {s.get('counts_pre_ok', '')}")
    w(f"- نجاح المعالج → شاشة الدخول: {s.get('v_wizard_saved', '')}؛ شاشة الدخول مع اسم المؤسسة: {s.get('v_login_screen', '')}؛ دون جلسة تلقائية: {s.get('v_no_auto_session', '')}")
    w(f"- /api/auth/me قبل الدخول: {s.get('v_me401_prelogin', '')} (المتوقع 401)")
    w(f"- إعادة التهيئة (عميل مستقل محلي): {s.get('repeat_setup', '')} — مطابقة: {s.get('repeat_ok', '')}")
    w(f"- الأعداد بعد المحاولة الثانية: {s.get('counts_post', '')} (متوقع 1|1|1) — مطابقة: {s.get('counts_post_ok', '')}")
    w(f"- الدخول الصريح بالمدير: {s.get('v_login_ok', '')}")
    w(f"- حجب الخروج: بقاء الجلسة {s.get('v_blocked_persist', '')}؛ تحذير + إعادة محاولة {s.get('v_warning_shown', '')}؛ /api/auth/me أثناءه {s.get('v_me200_blocked', '')} (المتوقع 200)")
    w(f"- إعادة المحاولة: {s.get('v_retry204', '')} (المتوقع 204 → شاشة الدخول)")
    w(f"- المسار المحمي بعد الخروج: {s.get('v_protected_login', '')}؛ /api/auth/me {s.get('v_me401_after', '')} (المتوقع 401)")
    w(f"- العميل المستقل (كوكي ما قبل الخروج): قبل {s.get('replay_pre', '')} / بعد {s.get('replay_post', '')} (المتوقع 200 ثم 401)")
    w(f"- الأعداد بعد الخروج: {s.get('counts_final', '')} — مطابقة: {s.get('counts_final_ok', '')}")
    w(f"- الحالة المسجلة: P0-A01 = **{s.get('a01_status', 'NOT_RUN')}** ({s.get('a01_note', '')})؛ P0-A04 = **{s.get('a04_status', 'NOT_RUN')}** ({s.get('a04_note', '')})")
    ev = s.get('evidence', '')
    if ev:
        w('- الأدلة:')
        for ref in [x for x in ev.split(',') if x]:
            name, _, sha = ref.partition(':')
            path = os.path.join(out, 'evidence', name)
            ok = os.path.isfile(path) and hashlib.sha256(open(path, 'rb').read()).hexdigest() == sha
            w(f"  - `evidence/{name}` — sha256 `{sha}` — {'موجودة ومطابقة' if ok else 'مفقودة أو غير مطابقة!'}")
    w('')
w('## حدود هذا المحضر')
w('')
w('- هذا سجل تنفيذ يدوي بواسطة المُختبِر المسمّى أعلاه على جهازه الشخصي، وفق بروتوكول القبول §4/§5A وورقة التنفيذ العربية.')
w('- فحصا إعادة التهيئة وإعادة تشغيل الجلسة نُفّذا كعميل HTTP مستقل محلي على جهاز المُختبِر ضمن جلسة الحزمة نفسها.')
w('- لا يتضمن هذا المحضر أي قيم جلسات أو كوكيز أو رموز أو كلمات مرور أو سلاسل اتصال.')
w('- لا يعتمد على CI؛ ونجاح CI لا يملأ أي خانة هنا.')
w('- يُرسل هذا المحضر مع results.json لتسجيله حرفياً في سجل القبول وفي Notion دون تغيير.')
w('')
md_path = os.path.join(out, 'PHASE-0-MANUAL-RESULTS.ar.md')
open(md_path, 'w').write('\n'.join(lines))
json.dump({'metadata': meta, 'sessions': {p: sessions[p] for p in order if p in sessions}},
          open(os.path.join(out, 'results.json'), 'w'), ensure_ascii=False, indent=1)
print(f'تم التوليد: {md_path}')
print(f"تم التوليد: {os.path.join(out, 'results.json')}")
PY
}

run_probes() { # وضع اختبار الصيانة: تشغيل الفحوص على خادم اختباري
  local url=$1
  echo "== repeat_setup_probe =="
  repeat_setup_probe "$url" | tail -1
  local cf
  cf=$(mktemp)
  if [[ -n ${PROBE_COOKIE-} ]]; then printf '%s' "$PROBE_COOKIE" > "$cf"; else printf 'test=1' > "$cf"; fi
  echo "== replay_probe =="
  replay_probe "$url" "$cf" | tail -1
  rm -f -- "$cf"
}

main() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --kit) KIT=$2; shift 2;;
      --out) OUT=$2; shift 2;;
      --assemble) MODE='assemble'; shift;;
      --redo) REDO=$2; shift 2;;
      --probe-url) MODE='probe'; PROBE_URL=$2; shift 2;;
      --probe-cookie) PROBE_COOKIE=$2; shift 2;;
      *) die "وسيط غير معروف: $1";;
    esac
  done
  [[ -n $OUT ]] || OUT='./phase0-acceptance'
  mkdir -p "$OUT"

  if [[ $MODE == probe ]]; then
    [[ -n ${PROBE_URL-} ]] || die '--probe-url يتطلب عنواناً.'
    run_probes "$PROBE_URL"; return 0
  fi

  if [[ $MODE == assemble ]]; then
    assemble; return 0
  fi

  [[ -n $KIT ]] || KIT='./phase0-manual'
  [[ -d $KIT ]] || die "مجلد الحزمة غير موجود: $KIT (استخدم --kit للإشارة إلى المجلد المفكوك)."
  if [[ -n $REDO ]]; then
    case " $PROFILES " in
      *" $REDO "*) ;;
      *) die "ملف غير معروف لـ --redo: $REDO (المتاح: $PROFILES)";;
    esac
  fi
  preflight

  sep
  echo 'مشغّل القبول اليدوي — Phase 0 (P0-A01 / P0-A04)'
  echo "نسخة القبول: $EXPECTED_SHA"
  echo "مخرجات التشغيل: $OUT"
  echo 'التنفيذ اليدوي والمشاهدة بيدك أنت؛ هذا المشغّل يسجّل ويتحقق ولا يعلن PASS من تلقاء نفسه.'
  echo 'استخدم بيانات وهمية فقط؛ لا تُدخل أي بيانات حقيقية.'
  collect_metadata

  for p in $PROFILES; do
    if [[ -f "$OUT/sessions/$p.json" && $REDO != "$p" ]]; then
      echo "تخطي $p — مسجّل مسبقاً (استخدم --redo $p لإعادته)."
      continue
    fi
    if [[ -n $REDO && $REDO != "$p" ]]; then continue; fi
    # حماية من بقايا جلسة سابقة داخل هذا الغلاف
    FIFO=''; KIT_PID=''; TAIL_PID=''
    trap cleanup_session EXIT INT TERM
    run_session "$p"
  done
  trap - EXIT INT TERM

  json_write "$OUT/metadata.json" generated "$(date -Is)"
  assemble
  sep
  echo 'انتهى. أرسل الملفين التاليين كما هما للتسجيل الحرفي في سجل القبول وNotion:'
  echo "  $OUT/PHASE-0-MANUAL-RESULTS.ar.md"
  echo "  $OUT/results.json"
  echo 'لا ترسل أي ملف آخر يحوي كوكيز أو رموزاً أو لقطات غير منقّحة.'
}

main "$@"
