import { Building2, MapPin, Users2 } from 'lucide-react';
import type { AppLanguage, ProjectDto } from "@/types/erp";
import { formatDzd } from "@/shared/utils/algerianFormat";
import { formatProjectStatus } from "@/shared/components/ProjectIdentityStrip";
import { DetailKeyValueList } from "@/shared/components/DetailKeyValueList";

interface ProjectOverviewPanelProps {
  project: ProjectDto;
  language: AppLanguage;
  canViewFinancials: boolean;
  onOpenStructure: () => void;
  onOpenCustomers: () => void;
  onOpenTeam: () => void;
}

export function ProjectOverviewPanel({
  project,
  language,
  canViewFinancials,
  onOpenStructure,
  onOpenCustomers,
  onOpenTeam,
}: ProjectOverviewPanelProps) {
  const isArabic = language === 'ar';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Building2 className="h-4 w-4 text-teal-800" aria-hidden="true" />
            <span>{isArabic ? 'الهيكل العقاري الفعلي' : 'Structure physique active'}</span>
          </div>
          <div className="text-2xl font-bold font-data text-slate-900">
            {project.actualBuildingsCount}{' '}
            <span className="text-xs font-normal text-slate-500">
              {isArabic ? 'عمارات' : 'bâtiments'}
            </span>{' '}
            · {project.actualUnitsCount}{' '}
            <span className="text-xs font-normal text-slate-500">
              {isArabic ? 'وحدة' : 'unités'}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenStructure}
            className="text-xs font-semibold text-teal-800 hover:underline pt-1"
          >
            {isArabic ? 'إدارة الهيكل والعمارات ←' : 'Gérer la structure & lots ←'}
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Users2 className="h-4 w-4 text-teal-800" aria-hidden="true" />
            <span>{isArabic ? 'سجل زبائن المشروع' : 'Registre clients projet'}</span>
          </div>
          <div className="text-2xl font-bold font-data text-slate-900">
            {project.members.length}{' '}
            <span className="text-xs font-normal text-slate-500">
              {isArabic ? 'أعضاء الفريق' : 'membres équipe'}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenCustomers}
            className="text-xs font-semibold text-teal-800 hover:underline pt-1"
          >
            {isArabic ? 'فتح زبائن المشروع و CRM ←' : 'Ouvrir clients & prospects ←'}
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <MapPin className="h-4 w-4 text-teal-800" aria-hidden="true" />
            <span>{isArabic ? 'الميزانية التقديرية' : 'Budget estimatif'}</span>
          </div>
          <div className="text-xl font-bold font-data text-slate-900">
            {canViewFinancials ? formatDzd(project.estimatedBudgetDzd, language) : (isArabic ? 'سرّي / مقيد' : 'Confidentiel')}
          </div>
          <button
            type="button"
            onClick={onOpenTeam}
            className="text-xs font-semibold text-teal-800 hover:underline pt-1"
          >
            {isArabic ? 'مراجعة صلاحيات الوصول وفريق العمل ←' : 'Vérifier habilitations & équipe ←'}
          </button>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          {isArabic ? 'البيانات الفنية والعقارية الأساسية' : 'Données techniques & foncières principales'}
        </h3>
        <DetailKeyValueList
          columns={2}
          items={[
            { label: isArabic ? 'رمز المشروع' : 'Code projet', value: project.code, monospace: true },
            { label: isArabic ? 'الحالة الحالية' : 'Statut actuel', value: formatProjectStatus(project.status, language) },
            { label: isArabic ? 'الولاية والبلدية' : 'Wilaya & commune', value: `${project.wilayaCode} — ${project.wilayaName} / ${project.municipality}` },
            { label: isArabic ? 'العنوان الدقيق' : 'Adresse exacte', value: project.address || '—' },
            { label: isArabic ? 'المرجع العقاري / الدفتر' : 'Référence foncière / Livret', value: project.landTitleReference || '—', monospace: true },
            { label: isArabic ? 'رقم رخصة البناء' : 'N° permis de construire', value: project.buildingPermitNumber || '—', monospace: true },
          ]}
        />
      </section>
    </div>
  );
}
