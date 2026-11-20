# قاعدة مراجعة البلديات الجزائرية (SQLite)

هذه نسخة للاستعلام والعمل الداخلي، تشمل 1,541 بلدية مرشّحة في 69 ولاية. ليست قاعدة الإنتاج ولا توقيعًا على صحة المقترحات. مصدر الأسماء والرموز هو [دفتر القرار](P1-01-DECISION-BOOK-1541.csv)، ومصدر التوقيع المهني وأسماء الولايات هو [سجل المطابقة](P1-01-MASTER-1541-RECONCILIATION-LEDGER.csv). يُستكمل القرار في ملفات المراجعة الأصلية، لا بتعديل النسخة المشتقة.

**الحصول عليها:** نزّل `communes-review-sqlite` من مخرجات تشغيل CI وفك الضغط، أو نفّذ من جذر المشروع باستخدام Python 3:

```sh
python3 scripts/build_commune_review_db.py storage/communes-review.sqlite3
```

افتح الملف في قارئ SQLite. لإعادة البناء بعد تحديث المصادر، اختر اسم ملف جديد؛ الأداة لا تستبدل قاعدة موجودة. لا تتصل بقاعدة التطبيق ولا تحتاج إلى بيانات دخول. يحفظ جدول `source_file` بصمتي SHA-256 لملفي المصدر.

**مثال: عرض بلديات وهران بحسب الولاية المرشّحة، مع تمييز المقترح عن القرار:**

```sql
SELECT w.name_ar AS wilaya, c.commune_name_ar_candidate, c.commune_name_fr_candidate,
       c.proposed_code, c.review_code, c.practitioner_signoff_status
FROM commune_review AS c JOIN candidate_wilaya AS w ON w.code = c.wilaya_code_candidate
WHERE w.code = '31' ORDER BY c.commune_name_ar_candidate;
```

الأكواد نصوص حتى تبقى الأصفار البادئة. `working_row_key` معرّف الصف، وليس رمز البلدية. `proposed_parent` قد يختلف عن `wilaya_code_candidate`؛ لا يحلّ أحدهما محل الآخر. لا يُملأ `review_code` من `proposed_code`، ولا يُشتق `valid_from` من تاريخ النشر. مثال على حالة تحتاج إلى دليل إضافي:

```sql
SELECT proposed_code, work_status, open_question, valid_from
FROM commune_review WHERE working_row_key = 'W30-R007';
```
