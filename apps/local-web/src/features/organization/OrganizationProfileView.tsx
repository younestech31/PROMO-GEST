import { useEffect, useState, type FormEvent } from 'react';
import type {
  AppLanguage,
  OrganizationSummary,
  UpdateOrganizationProfileRequest,
} from '../../types/erp';
import { apiClient, ApiConnectionError, ApiError } from '../../services/apiClient';
import { getTranslations, translateApiError } from '../../localization/translations';
import { ALGERIAN_LEGAL_FORMS, ALGERIAN_WILAYAS, findWilaya, formatAlgerianLegalForm, formatDzd } from '../../utils/algerianFormat';
import { FormField, inputBaseClass } from '../../components/FormField';

type OrganizationProfileDraft = Omit<UpdateOrganizationProfileRequest, 'expectedConcurrencyStamp'>;

interface OrganizationProfileViewProps {
  organization: OrganizationSummary;
  language: AppLanguage;
  canManage: boolean;
  onUpdated: (organization: OrganizationSummary) => void;
}

function toDraft(organization: OrganizationSummary): OrganizationProfileDraft {
  return {
    legalName: organization.legalName,
    tradeName: organization.tradeName,
    legalForm: organization.legalForm,
    nif: organization.nif,
    nis: organization.nis,
    tradeRegisterNumber: organization.tradeRegisterNumber,
    taxArticleNumber: organization.taxArticleNumber,
    shareCapitalDzd: organization.shareCapitalDzd,
    wilayaCode: organization.wilayaCode,
    wilayaName: organization.wilayaName,
    address: organization.address,
    phone: organization.phone,
    email: organization.email,
    defaultLanguage: organization.defaultLanguage,
  };
}

export function OrganizationProfileView({
  organization,
  language,
  canManage,
  onUpdated,
}: OrganizationProfileViewProps) {
  const t = getTranslations(language);
  const [draft, setDraft] = useState<OrganizationProfileDraft>(() => toDraft(organization));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setDraft(toDraft(organization));
  }, [organization]);

  const updateField = <K extends keyof OrganizationProfileDraft>(
    key: K,
    value: OrganizationProfileDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleEdit = () => {
    setDraft(toDraft(organization));
    setError(null);
    setSuccess(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(toDraft(organization));
    setError(null);
    setIsEditing(false);
  };

  const handleWilayaChange = (wilayaCode: string) => {
    const wilaya = findWilaya(wilayaCode);
    setDraft((current) => ({
      ...current,
      wilayaCode,
      wilayaName: wilaya ? `${wilaya.nameAr} / ${wilaya.nameFr}` : wilayaCode,
    }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      const updated = await apiClient.updateOrganizationProfile({
        ...draft,
        expectedConcurrencyStamp: organization.concurrencyStamp ?? '',
      });
      onUpdated(updated);
      setIsEditing(false);
      setSuccess(true);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(translateApiError(cause.code, cause.message, language));
      } else if (cause instanceof ApiConnectionError) {
        setError(t.operationTemporarilyUnavailable);
      } else {
        setError(t.operationTemporarilyUnavailable);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.organization.title}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.organization.subtitle}</p>
        </div>
        {canManage && !isEditing && (
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center justify-center rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            {t.organization.editButton}
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t.organization.saveSuccess}
        </div>
      )}
      {!canManage && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {t.organization.readOnlyNotice}
        </p>
      )}

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                {t.organization.fiscalTitle}
              </h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FormField id="organization-legalName" label={t.setup.legalName}>
                    <input
                      id="organization-legalName"
                      value={draft.legalName}
                      onChange={(event) => updateField('legalName', event.target.value)}
                      className={inputBaseClass}
                      maxLength={200}
                      required
                    />
                  </FormField>
                </div>
                <FormField id="organization-tradeName" label={t.setup.tradeName}>
                  <input
                    id="organization-tradeName"
                    value={draft.tradeName ?? ''}
                    onChange={(event) => updateField('tradeName', event.target.value || null)}
                    className={inputBaseClass}
                    maxLength={200}
                  />
                </FormField>
                <FormField id="organization-legalForm" label={t.setup.legalForm}>
                  <select
                    id="organization-legalForm"
                    value={draft.legalForm}
                    onChange={(event) => updateField('legalForm', event.target.value)}
                    className={inputBaseClass}
                  >
                    {ALGERIAN_LEGAL_FORMS.map((form) => (
                      <option key={form} value={form}>{formatAlgerianLegalForm(form, language)}</option>
                    ))}
                  </select>
                </FormField>
                <FormField id="organization-nif" label={t.setup.nif}>
                  <input
                    id="organization-nif"
                    dir="ltr"
                    value={draft.nif ?? ''}
                    onChange={(event) => updateField('nif', event.target.value || null)}
                    className={inputBaseClass}
                    maxLength={32}
                  />
                </FormField>
                <FormField id="organization-nis" label={t.setup.nis}>
                  <input
                    id="organization-nis"
                    dir="ltr"
                    value={draft.nis ?? ''}
                    onChange={(event) => updateField('nis', event.target.value || null)}
                    className={inputBaseClass}
                    maxLength={32}
                  />
                </FormField>
                <FormField id="organization-rc" label={t.setup.rc}>
                  <input
                    id="organization-rc"
                    dir="ltr"
                    value={draft.tradeRegisterNumber ?? ''}
                    onChange={(event) => updateField('tradeRegisterNumber', event.target.value || null)}
                    className={inputBaseClass}
                    maxLength={64}
                  />
                </FormField>
                <FormField id="organization-ai" label={t.setup.ai}>
                  <input
                    id="organization-ai"
                    dir="ltr"
                    value={draft.taxArticleNumber ?? ''}
                    onChange={(event) => updateField('taxArticleNumber', event.target.value || null)}
                    className={inputBaseClass}
                    maxLength={64}
                  />
                </FormField>
                <FormField id="organization-capital" label={t.setup.capitalDzd}>
                  <input
                    id="organization-capital"
                    type="number"
                    min="0"
                    step="0.01"
                    dir="ltr"
                    value={draft.shareCapitalDzd ?? ''}
                    onChange={(event) => updateField(
                      'shareCapitalDzd',
                      event.target.value === '' ? null : Number(event.target.value),
                    )}
                    className={inputBaseClass}
                  />
                </FormField>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                {t.organization.locationTitle}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <FormField id="organization-wilaya" label={t.setup.wilaya}>
                  <select
                    id="organization-wilaya"
                    value={draft.wilayaCode}
                    onChange={(event) => handleWilayaChange(event.target.value)}
                    className={inputBaseClass}
                  >
                    {ALGERIAN_WILAYAS.map((wilaya) => (
                      <option key={wilaya.code} value={wilaya.code}>
                        {wilaya.code} — {language === 'ar' ? wilaya.nameAr : wilaya.nameFr}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField id="organization-address" label={t.setup.address}>
                  <input
                    id="organization-address"
                    value={draft.address}
                    onChange={(event) => updateField('address', event.target.value)}
                    className={inputBaseClass}
                    maxLength={300}
                    required
                  />
                </FormField>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField id="organization-phone" label={t.setup.orgPhone}>
                    <input
                      id="organization-phone"
                      type="tel"
                      dir="ltr"
                      value={draft.phone ?? ''}
                      onChange={(event) => updateField('phone', event.target.value || null)}
                      className={inputBaseClass}
                      maxLength={40}
                    />
                  </FormField>
                  <FormField id="organization-email" label={t.setup.orgEmail}>
                    <input
                      id="organization-email"
                      type="email"
                      dir="ltr"
                      value={draft.email ?? ''}
                      onChange={(event) => updateField('email', event.target.value || null)}
                      className={inputBaseClass}
                      maxLength={160}
                    />
                  </FormField>
                </div>
                <FormField id="organization-defaultLanguage" label={t.setup.defaultLang}>
                  <select
                    id="organization-defaultLanguage"
                    value={draft.defaultLanguage}
                    onChange={(event) => updateField('defaultLanguage', event.target.value as AppLanguage)}
                    className={inputBaseClass}
                  >
                    <option value="ar">{t.languageArabic}</option>
                    <option value="fr">{t.languageFrench}</option>
                  </select>
                </FormField>
                <p className="text-xs text-slate-500">
                  {t.organization.currency}: <span className="font-data font-semibold">DZD</span>
                </p>
              </div>
            </section>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {t.organization.cancelButton}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
            >
              {isSaving ? t.organization.savingButton : t.organization.saveButton}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              {t.organization.fiscalTitle}
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t.setup.legalName}</dt>
                <dd className="font-semibold text-slate-900 text-end">{organization.legalName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t.setup.tradeName}</dt>
                <dd className="text-slate-900 text-end">{organization.tradeName ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t.setup.legalForm}</dt>
                <dd className="font-data text-slate-900">{formatAlgerianLegalForm(organization.legalForm, language)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">NIF</dt>
                <dd className="font-data text-slate-900">{organization.nif ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">NIS</dt>
                <dd className="font-data text-slate-900">{organization.nis ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">RC</dt>
                <dd className="font-data text-slate-900">{organization.tradeRegisterNumber ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">AI</dt>
                <dd className="font-data text-slate-900">{organization.taxArticleNumber ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t.setup.capitalDzd}</dt>
                <dd className="font-data text-slate-900">{formatDzd(organization.shareCapitalDzd, language)}</dd>
              </div>
            </dl>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              {t.organization.locationTitle}
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t.setup.wilaya}</dt>
                <dd className="text-slate-900">{organization.wilayaCode} — {organization.wilayaName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t.setup.address}</dt>
                <dd className="text-slate-900 text-end">{organization.address}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t.setup.orgPhone}</dt>
                <dd className="font-data text-slate-900">{organization.phone ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t.setup.orgEmail}</dt>
                <dd className="font-data text-slate-900">{organization.email ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-3 border-t border-slate-100">
                <dt className="text-slate-500">{t.setup.defaultLang}</dt>
                <dd className="font-data text-slate-900 uppercase">{organization.defaultLanguage}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t.organization.currency}</dt>
                <dd className="font-data text-slate-900">{organization.currencyCode}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
