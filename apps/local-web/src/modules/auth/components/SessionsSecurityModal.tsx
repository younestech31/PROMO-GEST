import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Laptop, LoaderCircle, LogOut, Monitor, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { ApiError, apiClient } from '../../../core/api/apiClient';
import { translateApiError } from '../../../core/localization/translations';
import type { AppLanguage, UserSessionDto } from '../../../types/erp';
import { Modal } from '@/shared/components/Modal';

interface SessionsSecurityModalProps {
  language: AppLanguage;
  onClose: () => void;
  hasUnsavedChanges: boolean;
  onCurrentSessionRevoked: () => void;
}

function formatDate(value: string, language: AppLanguage): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function SessionsSecurityModal({
  language,
  onClose,
  hasUnsavedChanges,
  onCurrentSessionRevoked,
}: SessionsSecurityModalProps) {
  const isArabic = language === 'ar';
  const [sessions, setSessions] = useState<UserSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmCurrent, setConfirmCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = {
    title: isArabic ? 'الجلسات النشطة' : 'Sessions actives',
    subtitle: isArabic ? 'الأجهزة التي تستخدم حسابك حالياً' : 'Appareils utilisant actuellement votre compte',
    privacy: isArabic
      ? 'تنبيه الخصوصية: قد يكشف عنوان IP وبيان المتصفح معلومات عن اتصالك وجهازك. هذه البيانات تقريبية ولا تثبت موقعك الفعلي أو هويتك.'
      : 'Confidentialité : l’adresse IP et les informations du navigateur peuvent révéler des éléments sur votre connexion et votre appareil. Elles restent indicatives et ne prouvent ni votre emplacement physique ni votre identité.',
    current: isArabic ? 'هذا الجهاز' : 'Cet appareil',
    created: isArabic ? 'تاريخ الإنشاء' : 'Créée le',
    lastSeen: isArabic ? 'آخر نشاط' : 'Dernière activité',
    expires: isArabic ? 'تنتهي في' : 'Expire le',
    ip: isArabic ? 'عنوان IP' : 'Adresse IP',
    unknown: isArabic ? 'غير متاح' : 'Indisponible',
    revoke: isArabic ? 'إنهاء الجلسة' : 'Révoquer la session',
    revokeCurrent: isArabic ? 'تسجيل الخروج من هذا الجهاز' : 'Déconnecter cet appareil',
    confirmCurrent: isArabic
      ? `سيؤدي ذلك إلى تسجيل خروجك من هذا الجهاز.${hasUnsavedChanges ? ' وقد تفقد التغييرات غير المحفوظة في العمل الحالي.' : ''} هل تريد المتابعة؟`
      : `Cette action vous déconnectera de cet appareil.${hasUnsavedChanges ? ' Les modifications non enregistrées du travail en cours peuvent être perdues.' : ''} Voulez-vous continuer ?`,
    confirm: isArabic ? 'تأكيد تسجيل الخروج' : 'Confirmer la déconnexion',
    cancel: isArabic ? 'إلغاء' : 'Annuler',
    empty: isArabic ? 'لا توجد جلسات نشطة أخرى.' : 'Aucune autre session active.',
    loading: isArabic ? 'جارٍ تحميل الجلسات...' : 'Chargement des sessions...',
    retry: isArabic ? 'إعادة المحاولة' : 'Réessayer',
    close: isArabic ? 'إغلاق' : 'Fermer',
  };

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await apiClient.listOwnSessions());
    } catch (cause) {
      const message = cause instanceof ApiError
        ? translateApiError(cause.code, cause.message, language)
        : (isArabic ? 'تعذر الاتصال بالخادم المحلي.' : 'Impossible de joindre le serveur local.');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isArabic, language]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const revoke = async (session: UserSessionDto, endCurrentSession: boolean) => {
    setRevokingId(session.id);
    setError(null);
    try {
      await apiClient.revokeOwnSession(session.id, endCurrentSession);
      if (session.isCurrentSession) {
        onCurrentSessionRevoked();
        return;
      }
      setConfirmCurrent(false);
      await loadSessions();
    } catch (cause) {
      const message = cause instanceof ApiError
        ? translateApiError(cause.code, cause.message, language)
        : (isArabic ? 'تعذر إنهاء الجلسة. تحقق من الاتصال ثم حاول مجدداً.' : 'Impossible de révoquer la session. Vérifiez la connexion puis réessayez.');
      setError(message);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <Modal
      open
      titleId="sessions-security-title"
      onClose={onClose}
      closeDisabled={revokingId !== null}
      dir={isArabic ? 'rtl' : 'ltr'}
      overlayClassName="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"
      panelClassName="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl outline-none"
    >
      <div>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-teal-50 p-2 text-teal-800"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h2 id="sessions-security-title" className="text-lg font-bold text-slate-900">{copy.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={revokingId !== null} aria-label={copy.close} className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="note">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{copy.privacy}</p>
          </div>

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          {loading ? (
            <div role="status" className="flex items-center gap-2 py-8 text-sm text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> {copy.loading}
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">{copy.empty}</p>
          ) : (
            <ul className="space-y-3">
              {sessions.map((session) => (
                <li key={session.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="rounded-md bg-slate-100 p-2 text-slate-700">
                        {session.isCurrentSession ? <Monitor className="h-5 w-5" aria-hidden="true" /> : <Laptop className="h-5 w-5" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{session.userAgent || copy.unknown}</p>
                          {session.isCurrentSession && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-900">{copy.current}</span>}
                        </div>
                        <p className="mt-1 break-all text-xs text-slate-500">{copy.ip}: {session.ipAddress || copy.unknown}</p>
                      </div>
                    </div>
                    {session.isCurrentSession ? (
                      <button
                        type="button"
                        onClick={() => setConfirmCurrent(true)}
                        disabled={revokingId !== null}
                        className="inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" /> {copy.revokeCurrent}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void revoke(session, false)}
                        disabled={revokingId !== null}
                        className="inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {revokingId === session.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
                        {copy.revoke}
                      </button>
                    )}
                  </div>
                  <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-xs sm:grid-cols-3">
                    <div><dt className="text-slate-500">{copy.created}</dt><dd className="mt-1 font-medium text-slate-800">{formatDate(session.createdAtUtc, language)}</dd></div>
                    <div><dt className="text-slate-500">{copy.lastSeen}</dt><dd className="mt-1 font-medium text-slate-800">{formatDate(session.lastSeenAtUtc, language)}</dd></div>
                    <div><dt className="text-slate-500">{copy.expires}</dt><dd className="mt-1 font-medium text-slate-800">{formatDate(session.expiresAtUtc, language)}</dd></div>
                  </dl>
                </li>
              ))}
            </ul>
          )}

          {confirmCurrent && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-900">{copy.confirmCurrent}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => { const current = sessions.find((item) => item.isCurrentSession); if (current) void revoke(current, true); }} disabled={revokingId !== null} className="rounded-md bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{copy.confirm}</button>
                <button type="button" onClick={() => setConfirmCurrent(false)} disabled={revokingId !== null} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{copy.cancel}</button>
              </div>
            </div>
          )}

          <footer className="flex justify-between gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => void loadSessions()} disabled={loading || revokingId !== null} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> {copy.retry}
            </button>
            <button type="button" onClick={onClose} className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white">{copy.close}</button>
          </footer>
        </div>
      </div>
    </Modal>
  );
}
