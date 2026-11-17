import { FolderKanban, MapPin, Pin, PinOff } from 'lucide-react';
import type { AppLanguage, ProjectDto } from '../../types/erp';

interface ProjectIdentityStripProps {
  project: ProjectDto;
  language: AppLanguage;
  isPinned: boolean;
  onTogglePin: () => void;
  onBrowseDirectory: () => void;
}

const STATUS_LABELS: Record<string, Record<AppLanguage, string>> = {
  Planning: { ar: 'قيد الدراسة والتصميم', fr: 'En étude / Planification' },
  UnderConstruction: { ar: 'قيد الإنجاز', fr: 'En construction' },
  Commercialization: { ar: 'قيد التسويق والبيع', fr: 'En commercialisation' },
  Delivered: { ar: 'مسلّم', fr: 'Livré' },
  Suspended: { ar: 'معلّق', fr: 'Suspendu' },
};

export function formatProjectStatus(status: string, language: AppLanguage): string {
  return STATUS_LABELS[status]?.[language] ?? status;
}

export function ProjectIdentityStrip({
  project,
  language,
  isPinned,
  onTogglePin,
  onBrowseDirectory,
}: ProjectIdentityStripProps) {
  const isArabic = language === 'ar';
  const primaryName = isArabic ? project.nameAr : project.nameFr;
  const secondaryName = isArabic ? project.nameFr : project.nameAr;

  return (
    <section
      aria-label={isArabic ? 'شريط هوية المشروع النشط' : 'Bandeau d’identité du projet actif'}
      className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-xs"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              dir="ltr"
              className="rounded border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-bold font-data text-teal-900"
            >
              {project.code}
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">{primaryName}</h2>
            {secondaryName && secondaryName !== primaryName && (
              <span className="text-xs text-slate-500 truncate">· {secondaryName}</span>
            )}
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              {formatProjectStatus(project.status, language)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-data">{project.wilayaCode}</span> {project.wilayaName} — {project.municipality}
              </span>
            </span>
            <span className="font-data text-[11px] text-slate-500">
              {project.actualBuildingsCount} {isArabic ? 'عمارات' : 'bâtiments'} · {project.actualUnitsCount}{' '}
              {isArabic ? 'وحدات' : 'unités'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onTogglePin}
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isPinned
                ? 'border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isPinned ? <PinOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Pin className="h-3.5 w-3.5" aria-hidden="true" />}
            <span>{isPinned ? (isArabic ? 'إلغاء التثبيت' : 'Désépingler') : (isArabic ? 'تثبيت' : 'Épingler')}</span>
          </button>

          <button
            type="button"
            onClick={onBrowseDirectory}
            className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isArabic ? 'دليل المشاريع' : 'Annuaire'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
