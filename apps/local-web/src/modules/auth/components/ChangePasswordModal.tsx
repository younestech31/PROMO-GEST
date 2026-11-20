import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, X } from 'lucide-react';
import type { AppLanguage } from '@/types/erp';
import { ApiConnectionError, ApiError, apiClient } from '@/core/api/apiClient';
import { getTranslations, translateApiError } from '@/core/localization/translations';
import { checkPasswordStrength } from '@/shared/utils/validation';
import { FormField, inputBaseClass } from '@/shared/components/FormField';

interface ChangePasswordModalProps {
  language: AppLanguage;
  onClose: () => void;
  /** Called after the server accepted the change; every session has been revoked at this point. */
  onCompleted: () => void;
}

/**
 * Voluntary password change for an already authenticated user. The server revokes every session
 * (including the current one) on success, so the caller signs the user out and shows the
 * "password changed" notice on the login screen.
 */
export function ChangePasswordModal({ language, onClose, onCompleted }: ChangePasswordModalProps) {
  const t = getTranslations(language);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError(t.auth.passwordCurrentRequired);
      return;
    }

    const strength = checkPasswordStrength(newPassword);
    if (!strength.maxLength) {
      setError(t.auth.passwordTooLong);
      return;
    }
    if (!strength.valid) {
      setError(t.setup.passwordHint);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.auth.passwordMismatch);
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
        setError(t.auth.passwordChangeFailed);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-800">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="change-password-title" className="text-base font-bold text-slate-900">
                {t.auth.changePasswordModalTitle}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{t.auth.changePasswordModalDescription}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label={t.auth.changePasswordCancel}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FormField id="change-password-current" label={t.auth.currentPassword}>
            <input
              id="change-password-current"
              type="password"
              dir="ltr"
              autoComplete="current-password"
              autoFocus
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputBaseClass}
              required
              disabled={submitting}
            />
          </FormField>

          <FormField id="change-password-new" label={t.auth.newPassword} hint={t.setup.passwordHint}>
            <input
              id="change-password-new"
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

          <FormField id="change-password-confirm" label={t.auth.confirmNewPassword}>
            <input
              id="change-password-confirm"
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {t.auth.changePasswordCancel}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-md bg-teal-800 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {submitting ? t.auth.changingPassword : t.auth.changePassword}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
