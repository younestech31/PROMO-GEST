import { useState, type FormEvent } from 'react';
import { Building2, Lock } from 'lucide-react';
import type { AppLanguage, SessionResponse } from '../../types/erp';
import { getTranslations, translateApiError } from '../../localization/translations';
import { validateLoginRequest, type ValidationErrors } from '../../utils/validation';
import { apiClient, ApiConnectionError, ApiError } from '../../services/apiClient';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { ConnectionIndicator, type ServerConnectionState } from '../../components/ConnectionIndicator';
import { FormField, inputBaseClass } from '../../components/FormField';
import { PreviewAccessButton } from './PreviewAccessButton';

interface LoginScreenProps {
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  organizationName: string | null;
  connectionState: ServerConnectionState;
  onRetryConnection: () => void;
  onLoggedIn: (session: SessionResponse) => void;
  isPreviewMode: boolean;
  onPreviewLogin: () => Promise<void>;
}

export function LoginScreen({
  language,
  onLanguageChange,
  organizationName,
  connectionState,
  onRetryConnection,
  onLoggedIn,
  isPreviewMode,
  onPreviewLogin,
}: LoginScreenProps) {
  const t = getTranslations(language);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const validation = validateLoginRequest({ usernameOrEmail, password }, language);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setIsSubmitting(true);
    try {
      const session = await apiClient.login({ usernameOrEmail, password });
      onLoggedIn(session);
    } catch (err) {
      if (err instanceof ApiConnectionError) {
        setAuthError(t.serverDisconnectedBannerTitle);
      } else if (err instanceof ApiError) {
        setAuthError(translateApiError(err.code, err.message, language));
      } else {
        setAuthError(language === 'ar' ? 'تعذر تسجيل الدخول.' : 'Échec de la connexion.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              {t.appTitle}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ConnectionIndicator
              state={connectionState}
              language={language}
              onRetry={onRetryConnection}
            />
            <LanguageSwitcher language={language} onChange={onLanguageChange} />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-8">
          <div className="mb-6">
            {organizationName && (
              <p className="text-xs font-semibold text-teal-800 mb-1">{organizationName}</p>
            )}
            <h1 className="text-xl font-bold text-slate-900">{t.auth.title}</h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{t.auth.subtitle}</p>
          </div>

          {authError && (
            <div
              role="alert"
              className="mb-5 rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
            >
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField
              id="login-username"
              label={t.auth.usernameOrEmail}
              error={errors.usernameOrEmail}
            >
              <input
                id="login-username"
                type="text"
                dir="ltr"
                autoComplete="username"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className={`${inputBaseClass} font-data`}
                required
              />
            </FormField>

            <FormField id="login-password" label={t.auth.password} error={errors.password}>
              <input
                id="login-password"
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputBaseClass}
                required
              />
            </FormField>

            <button
              type="submit"
              disabled={isSubmitting || connectionState === 'disconnected'}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
            >
              <Lock className="w-4 h-4" aria-hidden="true" />
              <span>{isSubmitting ? t.auth.signingIn : t.auth.signIn}</span>
            </button>
          </form>

          {isPreviewMode && (
            <div className="mt-5">
              <PreviewAccessButton language={language} onOpen={onPreviewLogin} />
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>{t.auth.localServerBadge}</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">{t.auth.sessionNotice}</p>
        </div>
      </main>
    </div>
  );
}
