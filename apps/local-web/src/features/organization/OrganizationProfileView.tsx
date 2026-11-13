import type { AppLanguage, OrganizationSummary } from '../../types/erp';
import { getTranslations } from '../../localization/translations';
import { formatDzd } from '../../utils/algerianFormat';

interface OrganizationProfileViewProps {
  organization: OrganizationSummary;
  language: AppLanguage;
}

export function OrganizationProfileView({ organization, language }: OrganizationProfileViewProps) {
  const t = getTranslations(language);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.organization.title}</h1>
        <p className="text-sm text-slate-600 mt-1">{t.organization.subtitle}</p>
      </div>

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
              <dd className="font-data text-slate-900">{organization.legalForm}</dd>
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
              <dd className="font-data text-slate-900">
                {formatDzd(organization.shareCapitalDzd, language)}
              </dd>
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
              <dd className="text-slate-900">
                {organization.wilayaCode} — {organization.wilayaName}
              </dd>
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
              <dt className="text-slate-500">Currency</dt>
              <dd className="font-data text-slate-900">{organization.currencyCode}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
