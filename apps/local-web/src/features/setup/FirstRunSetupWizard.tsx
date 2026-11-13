import { useState, type FormEvent } from 'react';
import { Building2, Check, ShieldCheck } from 'lucide-react';
import type { AppLanguage, InitializeInstallationRequest } from '../../types/erp';
import { getTranslations, translateApiError } from '../../localization/translations';
import { ALGERIAN_LEGAL_FORMS, ALGERIAN_WILAYAS, findWilaya } from '../../utils/algerianFormat';
import { checkPasswordStrength, validateSetupRequest, type ValidationErrors } from '../../utils/validation';
import { apiClient, ApiConnectionError, ApiError } from '../../services/apiClient';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { FormField, inputBaseClass } from '../../components/FormField';
import { PreviewAccessButton } from '../auth/PreviewAccessButton';

interface FirstRunSetupWizardProps {
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  onInitialized: () => void | Promise<void>;
  isPreviewMode: boolean;
  onPreviewLogin: () => Promise<void>;
}

export function FirstRunSetupWizard({
  language,
  onLanguageChange,
  onInitialized,
  isPreviewMode,
  onPreviewLogin,
}: FirstRunSetupWizardProps) {
  const t = getTranslations(language);

  const [form, setForm] = useState<InitializeInstallationRequest>({
    legalName: '',
    tradeName: '',
    legalForm: 'SARL',
    nif: '',
    nis: '',
    tradeRegisterNumber: '',
    taxArticleNumber: '',
    shareCapitalDzd: undefined,
    wilayaCode: '16',
    wilayaName: 'الجزائر / Alger',
    address: '',
    organizationPhone: '',
    organizationEmail: '',
    defaultLanguage: language,
    adminUsername: '',
    adminFullName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = checkPasswordStrength(form.adminPassword);

  const handleWilayaChange = (code: string) => {
    const w = findWilaya(code);
    setForm((prev) => ({
      ...prev,
      wilayaCode: code,
      wilayaName: w ? `${w.nameAr} / ${w.nameFr}` : code,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // The preview page can outlive the API process or retain an older setup screen.
      // Re-read the authoritative database-backed status before attempting a POST.
      // This avoids sending a request that the embedded preview gateway may block
      // when the installation was already completed in another browser/session.
      const currentSetup = await apiClient.getSetupStatus();
      if (currentSetup.isInitialized) {
        setErrors({});
        await onInitialized();
        return;
      }

      const validation = validateSetupRequest(form, confirmPassword, language);
      setErrors(validation);
      if (Object.keys(validation).length > 0) {
        return;
      }

      await apiClient.initializeInstallation({
        ...form,
        shareCapitalDzd: form.shareCapitalDzd ?? null,
      });
      await onInitialized();
    } catch (err) {
      // A concurrent first-run request may have initialized the installation
      // after the status check. Treat the API conflict as completed setup.
      if (err instanceof ApiError && err.code === 'SETUP_ALREADY_INITIALIZED') {
        await onInitialized();
      } else if (err instanceof ApiConnectionError) {
        setSubmitError(t.serverDisconnectedBannerTitle);
      } else if (err instanceof ApiError) {
        setSubmitError(translateApiError(err.code, err.message, language));
      } else {
        setSubmitError(language === 'ar' ? 'حدث خطأ غير متوقع أثناء التهيئة.' : "Erreur inattendue lors de l'initialisation.");
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
            <div className="w-9 h-9 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                {t.appTitle}
              </div>
              <div className="text-xs text-slate-500">{t.appSubtitle}</div>
            </div>
          </div>
          <LanguageSwitcher language={language} onChange={onLanguageChange} />
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-semibold text-teal-800 mb-1">{t.setup.eyebrow}</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.setup.title}</h1>
            <p className="text-sm text-slate-600 mt-1.5 max-w-3xl">{t.setup.subtitle}</p>
            {isPreviewMode && (
              <div className="mt-4 max-w-md">
                <PreviewAccessButton language={language} onOpen={onPreviewLogin} />
              </div>
            )}
          </div>

          {submitError && (
            <div
              role="alert"
              className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
            >
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            {/* Section 1: Organization Identity */}
            <section className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-base font-bold text-slate-900">{t.setup.orgSectionTitle}</h2>
                <p className="text-xs text-slate-500 mt-1">{t.setup.orgSectionDesc}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <FormField id="setup-legalName" label={t.setup.legalName} error={errors.legalName}>
                    <input
                      id="setup-legalName"
                      type="text"
                      value={form.legalName}
                      onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))}
                      placeholder={t.setup.legalNamePlaceholder}
                      className={inputBaseClass}
                      required
                    />
                  </FormField>
                </div>

                <FormField id="setup-legalForm" label={t.setup.legalForm} error={errors.legalForm}>
                  <select
                    id="setup-legalForm"
                    value={form.legalForm}
                    onChange={(e) => setForm((p) => ({ ...p, legalForm: e.target.value }))}
                    className={inputBaseClass}
                  >
                    {ALGERIAN_LEGAL_FORMS.map((lf) => (
                      <option key={lf} value={lf}>
                        {lf}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField id="setup-tradeName" label={t.setup.tradeName}>
                  <input
                    id="setup-tradeName"
                    type="text"
                    value={form.tradeName ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, tradeName: e.target.value }))}
                    className={inputBaseClass}
                  />
                </FormField>

                <FormField id="setup-wilaya" label={t.setup.wilaya} error={errors.wilayaCode}>
                  <select
                    id="setup-wilaya"
                    value={form.wilayaCode}
                    onChange={(e) => handleWilayaChange(e.target.value)}
                    className={inputBaseClass}
                  >
                    {ALGERIAN_WILAYAS.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.code} — {language === 'ar' ? w.nameAr : w.nameFr}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField id="setup-defaultLang" label={t.setup.defaultLang}>
                  <select
                    id="setup-defaultLang"
                    value={form.defaultLanguage}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, defaultLanguage: e.target.value as AppLanguage }))
                    }
                    className={inputBaseClass}
                  >
                    <option value="ar">{t.languageArabic}</option>
                    <option value="fr">{t.languageFrench}</option>
                  </select>
                </FormField>

                <div className="md:col-span-2">
                  <FormField id="setup-address" label={t.setup.address} error={errors.address}>
                    <input
                      id="setup-address"
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                      className={inputBaseClass}
                      required
                    />
                  </FormField>
                </div>

                <FormField id="setup-orgEmail" label={t.setup.orgEmail}>
                  <input
                    id="setup-orgEmail"
                    type="email"
                    dir="ltr"
                    value={form.organizationEmail ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, organizationEmail: e.target.value }))}
                    placeholder="contact@entreprise.dz"
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="setup-nif" label={t.setup.nif} error={errors.nif}>
                  <input
                    id="setup-nif"
                    type="text"
                    dir="ltr"
                    value={form.nif ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, nif: e.target.value }))}
                    placeholder="001616012345678"
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="setup-nis" label={t.setup.nis}>
                  <input
                    id="setup-nis"
                    type="text"
                    dir="ltr"
                    value={form.nis ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, nis: e.target.value }))}
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="setup-rc" label={t.setup.rc}>
                  <input
                    id="setup-rc"
                    type="text"
                    dir="ltr"
                    value={form.tradeRegisterNumber ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, tradeRegisterNumber: e.target.value }))}
                    placeholder="16/00-1234567B20"
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="setup-ai" label={t.setup.ai}>
                  <input
                    id="setup-ai"
                    type="text"
                    dir="ltr"
                    value={form.taxArticleNumber ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, taxArticleNumber: e.target.value }))}
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="setup-capital" label={t.setup.capitalDzd} error={errors.shareCapitalDzd}>
                  <input
                    id="setup-capital"
                    type="number"
                    min="0"
                    step="0.01"
                    dir="ltr"
                    value={form.shareCapitalDzd ?? ''}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        shareCapitalDzd: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="setup-orgPhone" label={t.setup.orgPhone}>
                  <input
                    id="setup-orgPhone"
                    type="tel"
                    dir="ltr"
                    value={form.organizationPhone ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, organizationPhone: e.target.value }))}
                    placeholder="+213 21 00 00 00"
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>
              </div>
            </section>

            {/* Section 2: Single System Administrator */}
            <section className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="border-b border-slate-100 pb-4 mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{t.setup.adminSectionTitle}</h2>
                  <p className="text-xs text-slate-500 mt-1">{t.setup.adminSectionDesc}</p>
                </div>
                <ShieldCheck className="w-5 h-5 text-teal-800 shrink-0" aria-hidden="true" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField id="setup-adminUsername" label={t.setup.adminUsername} error={errors.adminUsername}>
                  <input
                    id="setup-adminUsername"
                    type="text"
                    dir="ltr"
                    autoComplete="username"
                    value={form.adminUsername}
                    onChange={(e) => setForm((p) => ({ ...p, adminUsername: e.target.value }))}
                    placeholder="sysadmin"
                    className={`${inputBaseClass} font-data`}
                    required
                  />
                </FormField>

                <FormField id="setup-adminFullName" label={t.setup.adminFullName} error={errors.adminFullName}>
                  <input
                    id="setup-adminFullName"
                    type="text"
                    value={form.adminFullName}
                    onChange={(e) => setForm((p) => ({ ...p, adminFullName: e.target.value }))}
                    className={inputBaseClass}
                    required
                  />
                </FormField>

                <FormField id="setup-adminEmail" label={t.setup.adminEmail} error={errors.adminEmail}>
                  <input
                    id="setup-adminEmail"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm((p) => ({ ...p, adminEmail: e.target.value }))}
                    className={`${inputBaseClass} font-data`}
                    required
                  />
                </FormField>

                <FormField id="setup-adminPhone" label={t.setup.adminPhone}>
                  <input
                    id="setup-adminPhone"
                    type="tel"
                    dir="ltr"
                    value={form.adminPhone ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, adminPhone: e.target.value }))}
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField
                  id="setup-adminPassword"
                  label={t.setup.adminPassword}
                  error={errors.adminPassword}
                  hint={t.setup.passwordHint}
                >
                  <input
                    id="setup-adminPassword"
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    value={form.adminPassword}
                    onChange={(e) => setForm((p) => ({ ...p, adminPassword: e.target.value }))}
                    className={inputBaseClass}
                    required
                  />
                </FormField>

                <FormField
                  id="setup-confirmPassword"
                  label={t.setup.confirmPassword}
                  error={errors.confirmPassword}
                >
                  <input
                    id="setup-confirmPassword"
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputBaseClass}
                    required
                  />
                </FormField>
              </div>

              {form.adminPassword.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                  <span className={strength.minLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    {strength.minLength ? '✓ ' : '· '}10+ chars
                  </span>
                  <span className={strength.hasUpper ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    {strength.hasUpper ? '✓ ' : '· '}A-Z
                  </span>
                  <span className={strength.hasLower ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    {strength.hasLower ? '✓ ' : '· '}a-z
                  </span>
                  <span className={strength.hasDigit ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                    {strength.hasDigit ? '✓ ' : '· '}0-9
                  </span>
                </div>
              )}
            </section>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
              <p className="text-xs text-slate-500">{t.setup.singleAdminNotice}</p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>{isSubmitting ? t.setup.submitting : t.setup.submitButton}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
