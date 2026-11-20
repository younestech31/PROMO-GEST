import { useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck, LogOut } from 'lucide-react';
import type { AppLanguage } from '@/types/erp';
import { ApiConnectionError, ApiError, apiClient } from '@/core/api/apiClient';
import { getTranslations, translateApiError } from '@/core/localization/translations';
import { checkPasswordStrength, PASSWORD_MAX_LENGTH } from '@/shared/utils/validation';
import { FormField, inputBaseClass } from '@/shared/components/FormField';

interface ChangePasswordRequiredScreenProps {
  language: AppLanguage;
  fullName: string;
  username: string;
  onCompleted: () => void;
  onLogout: () => void;
  logoutFailed: boolean;
}

export function ChangePasswordRequiredScreen({
  language,
  fullName,
  username,
  onCompleted,
  onLogout,
  logoutFailed,
}: ChangePasswordRequiredScreenProps) {
  const t = getTranslations(language);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError(language === 'ar' ? 'يرجى إدخال كلمة المرور المؤقتة الحالية.' : 'Saisissez le mot de passe temporaire actuel.');
      return;
    }

    const strength = checkPasswordStrength(newPassword);
    if (!strength.maxLength) {
      setError(
        language === 'ar'
          ? `كلمة المرور يجب ألا تتجاوز ${PASSWORD_MAX_LENGTH} حرفاً.`
          : `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`
      );
      return;
    }
    if (!strength.valid) {
      setError(t.setup.passwordHint);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(
        language === 'ar'
          ? 'تأكيد كلمة المرور الجديدة غير مطابق.'
          : 'La confirmation du nouveau mot de passe ne correspond pas.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.changePassword({ currentPassword, newPassword });
      onCompleted();
    } catch (err) {
      if (err instanceof ApiConnectionError) {
        setError(t.operationTemporarilyUnavailable);
      } else if (err instanceof ApiError) {
        setError(translateApiError(err.code, err.message, language));
      } else {
        setError(language === 'ar' ? 'تعذر تغيير كلمة المرور.' : 'Impossible de modifier le mot de passe.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight">{t.appTitle}</p>
            <p className="text-xs text-slate-500">{username}</p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-800">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{t.auth.passwordChangeRequiredTitle}</h1>
              <p className="mt-1 text-sm text-slate-600">{fullName}</p>
            </div>
          </div>

          <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            {t.auth.passwordChangeRequiredDescription}
          </p>

          {logoutFailed && (
            <div role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {t.auth.logoutFailed}
            </div>
          )}

          {error && (
            <div role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField id="temporary-current-password" label={t.auth.currentPassword}>
              <input
                id="temporary-current-password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className={inputBaseClass}
                required
                disabled={submitting}
              />
            </FormField>

            <FormField id="personal-new-password" label={t.auth.newPassword} hint={t.setup.passwordHint}>
              <input
                id="personal-new-password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className={inputBaseClass}
                required
                disabled={submitting}
              />
            </FormField>

            <FormField id="confirm-personal-password" label={t.auth.confirmNewPassword}>
              <input
                id="confirm-personal-password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputBaseClass}
                required
                disabled={submitting}
              />
            </FormField>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {submitting ? t.auth.changingPassword : t.auth.changePassword}
            </button>
          </form>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onLogout}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t.auth.signOut}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
