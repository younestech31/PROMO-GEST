import { useMemo, useState } from 'react';
import { AlertCircle, MapPin, Search } from 'lucide-react';
import type { AppLanguage } from '@/types/erp';
import { useAdministrativeReference } from '@/modules/module-a-organization/hooks/useAdministrativeReference';
import { PageHeader } from '@/components/PageHeader';
import { ErrorBanner, LoadingSkeleton } from '@/components/StateViews';
import { inputBaseClass } from '@/components/FormField';

interface TerritorialReferenceViewProps {
  language: AppLanguage;
  onNavigateHome: () => void;
}

export function TerritorialReferenceView({
  language,
  onNavigateHome,
}: TerritorialReferenceViewProps) {
  const isArabic = language === 'ar';
  const { reference, isLoading, hasError, retry } = useAdministrativeReference();
  const [filterText, setFilterText] = useState('');

  const filteredWilayas = useMemo(() => {
    const items = reference?.wilayas ?? [];
    const q = filterText.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (w) =>
        w.code.toLowerCase().includes(q) ||
        w.nameAr.toLowerCase().includes(q) ||
        w.nameFr.toLowerCase().includes(q) ||
        w.canonicalDisplayName.toLowerCase().includes(q)
    );
  }, [reference, filterText]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isArabic ? 'المرجع الإقليمي الجزائري (69 ولاية)' : 'Référentiel territorial algérien (69 wilayas)'}
        subtitle={
          isArabic
            ? 'البيانات الإقليمية الرسمية المعتمدة للولايات وحالة التحقق من قائمة البلديات.'
            : 'Référentiel officiel des 69 wilayas et statut de vérification du catalogue communal.'
        }
        language={language}
        moduleCode="A"
        moduleState="PARTIALLY_IMPLEMENTED"
        breadcrumbs={[
          { label: isArabic ? 'مساحة المؤسسة' : 'Organisation', onClick: onNavigateHome },
          { label: isArabic ? 'المرجع الإقليمي' : 'Référentiel territorial' },
        ]}
      />

      {hasError && (
        <ErrorBanner
          message={isArabic ? 'تعذر تحميل المرجع الإقليمي من الخادم المحلي.' : 'Impossible de charger le référentiel territorial.'}
          actionLabel={isArabic ? 'إعادة المحاولة' : 'Réessayer'}
          onAction={retry}
        />
      )}

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : reference ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <MapPin className="h-4 w-4 text-teal-800" aria-hidden="true" />
                <span>{isArabic ? 'بيانات الإصدار الرسمي للولايات' : 'Métadonnées du référentiel officiel'}</span>
              </div>
              <dl className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div>
                  <dt className="text-slate-500">{isArabic ? 'رقم الإصدار' : 'Version'}</dt>
                  <dd className="font-data font-semibold text-slate-900 mt-0.5" dir="ltr">{reference.version}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{isArabic ? 'تاريخ السريان' : 'Date d’effet'}</dt>
                  <dd className="font-data font-semibold text-slate-900 mt-0.5" dir="ltr">{reference.effectiveDate}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">{isArabic ? 'السند القانوني' : 'Source réglementaire'}</dt>
                  <dd className="font-medium text-slate-800 mt-0.5">{reference.legalSource}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border border-amber-200 bg-amber-50/70 p-5 space-y-2 text-xs text-amber-950">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" aria-hidden="true" />
                <span>
                  {isArabic ? 'حالة جدول البلديات (1,541 بلدية)' : 'Statut du référentiel communal (1 541 communes)'}
                </span>
              </div>
              <p className="leading-relaxed">
                {isArabic
                  ? `الحالة الحالية على الخادم: ${reference.communeDatasetStatus} — عدد البلديات المنشورة للربط البرمجي حالياً: ${reference.communesCount} من أصل ${reference.communeLegalBaselineCount} بلدية مرجعية. يستمر إدخال اسم البلدية نصياً في المشاريع حتى نشر القائمة الرسمية المعتمدة.`
                  : `Statut serveur : ${reference.communeDatasetStatus} — Communes publiées : ${reference.communesCount} sur ${reference.communeLegalBaselineCount}. La saisie texte de la commune reste active jusqu’à publication officielle validée.`}
              </p>
            </section>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
              <div className="text-sm font-bold text-slate-900">
                {isArabic ? `قائمة الولايات (${filteredWilayas.length} / ${reference.wilayas.length})` : `Liste des wilayas (${filteredWilayas.length} / ${reference.wilayas.length})`}
              </div>
              <div className="relative w-full sm:w-72">
                <Search
                  className={`h-4 w-4 text-slate-400 absolute top-2.5 ${isArabic ? 'right-3' : 'left-3'}`}
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder={isArabic ? 'تصفية بالرمز أو الاسم...' : 'Filtrer par code ou nom...'}
                  className={`${inputBaseClass} ${isArabic ? 'pr-9' : 'pl-9'}`}
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-xs text-start border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <tr>
                    <th className="py-2.5 px-4 text-start">{isArabic ? 'الرمز' : 'Code'}</th>
                    <th className="py-2.5 px-4 text-start">{isArabic ? 'الاسم بالعربية' : 'Nom arabe'}</th>
                    <th className="py-2.5 px-4 text-start">{isArabic ? 'الاسم بالفرنسية' : 'Nom français'}</th>
                    <th className="py-2.5 px-4 text-start">{isArabic ? 'التسمية الموحدة' : 'Libellé canonique'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWilayas.map((w) => (
                    <tr key={w.code} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-data font-bold text-teal-900" dir="ltr">{w.code}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{w.nameAr}</td>
                      <td className="py-2.5 px-4 text-slate-700" dir="ltr">{w.nameFr}</td>
                      <td className="py-2.5 px-4 text-slate-500">{w.canonicalDisplayName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
