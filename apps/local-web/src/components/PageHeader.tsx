import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AppLanguage } from '../types/erp';
import { getModuleStateLabel, type ModuleImplementationState } from '../utils/moduleCatalog';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  language: AppLanguage;
  breadcrumbs?: BreadcrumbItem[];
  moduleCode?: string;
  moduleState?: ModuleImplementationState;
  actions?: ReactNode;
}

export function ModuleStateTag({
  state,
  language,
  moduleCode,
}: {
  state: ModuleImplementationState;
  language: AppLanguage;
  moduleCode?: string;
}) {
  const tone =
    state === 'IMPLEMENTED'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : state === 'PARTIAL'
        ? 'border-teal-200 bg-teal-50 text-teal-900'
        : 'border-amber-200 bg-amber-50 text-amber-900';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold tracking-tight whitespace-nowrap ${tone}`}
    >
      {moduleCode && <span className="font-data uppercase">{moduleCode}</span>}
      <span>{getModuleStateLabel(state, language)}</span>
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  language,
  breadcrumbs,
  moduleCode,
  moduleState,
  actions,
}: PageHeaderProps) {
  const Separator = language === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5 min-w-0">
                {index > 0 && <Separator className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />}
                {crumb.onClick ? (
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className="truncate font-medium text-slate-600 hover:text-teal-800 hover:underline focus-visible:outline-2 focus-visible:outline-teal-700"
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="truncate font-medium text-slate-800">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {moduleState && <ModuleStateTag state={moduleState} language={language} moduleCode={moduleCode} />}
        </div>

        {subtitle && <p className="text-sm text-slate-600 max-w-3xl">{subtitle}</p>}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
