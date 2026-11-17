import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, CheckSquare, Clock, Info, Layers3, ShieldCheck } from 'lucide-react';
import type { AppLanguage } from '../../types/erp';
import {
  getModuleStateLabel,
  type ModuleCode,
  type ModuleImplementationState,
} from '../../core/modules/moduleCodes';
import { ModuleStateTag } from './PageHeader';

export interface PlannedWorkflowColumn {
  ar: string;
  fr: string;
}

export interface PlannedSubWorkflowItem {
  id: string;
  label: Record<AppLanguage, string>;
  state: ModuleImplementationState;
  description: Record<AppLanguage, string>;
  columns: readonly PlannedWorkflowColumn[];
  disabledActions: readonly PlannedWorkflowColumn[];
}

export interface PlannedCrossModuleLink {
  label: Record<AppLanguage, string>;
  description?: Record<AppLanguage, string>;
  onClick: () => void;
}

export interface PlannedModuleShellProps {
  moduleCode: ModuleCode;
  moduleState: ModuleImplementationState;
  title: Record<AppLanguage, string>;
  summary: Record<AppLanguage, string>;
  scopeNote: Record<AppLanguage, string>;
  prerequisites?: Record<AppLanguage, string>;
  language: AppLanguage;
  contextName?: string;
  initialSubTab?: string;
  subWorkflows: readonly PlannedSubWorkflowItem[];
  invariants?: readonly Record<AppLanguage, string>[];
  plannedEndpoints?: readonly string[];
  crossLinks?: readonly PlannedCrossModuleLink[];
  extraTopContent?: ReactNode;
}

/**
 * Pure presentational shell for planned workflows.
 * Accepts explicit structured workflow props from domain modules (never imports the registry directly).
 */
export function PlannedModuleShell({
  moduleCode,
  moduleState,
  title,
  summary,
  scopeNote,
  prerequisites,
  language,
  contextName,
  initialSubTab,
  subWorkflows,
  invariants = [],
  plannedEndpoints = [],
  crossLinks = [],
  extraTopContent,
}: PlannedModuleShellProps) {
  const isArabic = language === 'ar';
  const [selectedSubId, setSelectedSubId] = useState<string>(
    initialSubTab ?? subWorkflows[0]?.id ?? 'workspace'
  );

  useEffect(() => {
    setSelectedSubId(initialSubTab ?? subWorkflows[0]?.id ?? 'workspace');
  }, [moduleCode, initialSubTab, subWorkflows]);

  const activeSub = subWorkflows.find((s) => s.id === selectedSubId) ?? subWorkflows[0];
  const columns = activeSub?.columns ?? [];
  const subDescription = activeSub?.description?.[language] ?? summary[language];
  const disabledActions = activeSub?.disabledActions ?? [];

  return (
    <div className="space-y-5">
      {/* Architecture boundary & legal readiness notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3.5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Clock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <div className="font-semibold">
              {isArabic
                ? `وحدة مخططة — ${title.ar}${contextName ? ` · ${contextName}` : ''}`
                : `Module planifié — ${title.fr}${contextName ? ` · ${contextName}` : ''}`}
            </div>
            <p className="text-amber-900/90 leading-relaxed">{scopeNote[language]}</p>
            {prerequisites && (
              <p className="text-[11px] text-amber-800 flex items-start gap-1.5 pt-0.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{prerequisites[language]}</span>
              </p>
            )}
          </div>
        </div>
        {crossLinks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {crossLinks.map((link, idx) => (
              <button
                key={idx}
                type="button"
                onClick={link.onClick}
                className="inline-flex items-center gap-1.5 rounded border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                <span>{link.label[language]}</span>
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>

      {extraTopContent}

      {/* Domain-tailored workflow switcher and structural matrix */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 pt-3 flex flex-wrap gap-1.5" role="tablist">
          {subWorkflows.map((sub) => {
            const active = sub.id === activeSub?.id;
            return (
              <button
                key={sub.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSelectedSubId(sub.id)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-teal-800 text-teal-900 bg-white rounded-t'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {sub.label[language]}
              </button>
            );
          })}
        </div>

        <div className="p-5 space-y-5">
          {activeSub && (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{activeSub.label[language]}</h2>
                  <ModuleStateTag
                    state={activeSub.state ?? moduleState}
                    language={language}
                    moduleCode={moduleCode}
                  />
                </div>
                <p className="text-xs text-slate-600 mt-1">{subDescription}</p>
              </div>
              {disabledActions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {disabledActions.map((act, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled
                      title={
                        isArabic
                          ? 'غير متاح حالياً — بانتظار تنفيذ الخادم لهذه المرحلة'
                          : 'Indisponible — en attente d’implémentation serveur pour cette phase'
                      }
                      className="rounded border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed"
                    >
                      {isArabic ? act.ar : act.fr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Neutral planned structure preview without fake data */}
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/60 p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Layers3 className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>
                {isArabic
                  ? 'نطاق الواجهة المستقبلي والضوابط المطلوبة قبل تفعيل الخادم'
                  : 'Périmètre d’interface cible et contrôles requis avant activation serveur'}
              </span>
            </div>

            {columns.length > 0 && (
              <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      {columns.map((col, idx) => (
                        <th key={idx} className="px-3 py-2.5 text-start font-semibold whitespace-nowrap">
                          {isArabic ? col.ar : col.fr}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                        {isArabic
                          ? `لا توجد بيانات تنفيذية هنا بعد — الحالة: ${getModuleStateLabel(activeSub?.state ?? 'PLANNED', 'ar')}. لا تعرض هذه الشاشة أي أرقام أو عمليات وهمية.`
                          : `Aucune donnée opérationnelle active ici — Statut : ${getModuleStateLabel(activeSub?.state ?? 'PLANNED', 'fr')}. Aucune valeur ni écriture simulée n’est affichée.`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              {subWorkflows.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubId(sub.id)}
                  className={`flex items-center justify-between gap-2 rounded border px-3 py-2.5 text-start transition-colors ${
                    sub.id === activeSub?.id
                      ? 'border-teal-700 bg-teal-50/40'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckSquare className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="truncate font-medium text-slate-800">{sub.label[language]}</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 shrink-0">
                    {getModuleStateLabel(sub.state, language)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {(invariants.length > 0 || plannedEndpoints.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
              {invariants.length > 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
                    <span>
                      {isArabic ? 'قواعد العمل والثوابت القانونية المقررة' : 'Règles métier et invariants obligatoires'}
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600 list-disc ps-4">
                    {invariants.map((inv, idx) => (
                      <li key={idx}>{inv[language]}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plannedEndpoints.length > 0 && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <div className="text-xs font-bold text-slate-800">
                    {isArabic ? 'عقود API المخططة (ASP.NET Core 10)' : 'Contrats API planifiés (ASP.NET Core 10)'}
                  </div>
                  <ul className="space-y-1 text-[11px] font-data text-slate-600" dir="ltr">
                    {plannedEndpoints.map((endpoint) => (
                      <li key={endpoint} className="truncate rounded bg-white border border-slate-200 px-2 py-1">
                        {endpoint}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
