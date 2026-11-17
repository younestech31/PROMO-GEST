import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckSquare, Clock, Info, Layers3, X } from 'lucide-react';
import type { AppLanguage } from '../types/erp';
import { getModuleDefinition, getModuleStateLabel, type ModuleCode } from '../utils/moduleCatalog';
import { ModuleStateTag } from './PageHeader';

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-9 bg-slate-100 rounded animate-pulse" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
      {icon && <div className="mx-auto mb-3 flex justify-center text-slate-400">{icon}</div>}
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-100"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'warning',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`h-5 w-5 shrink-0 ${tone === 'danger' ? 'text-red-700' : 'text-amber-700'}`}
              aria-hidden="true"
            />
            <h2 id="confirm-dialog-title" className="text-base font-bold text-slate-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={cancelLabel}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>

        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-xs font-semibold text-white ${
              tone === 'danger' ? 'bg-red-700 hover:bg-red-800' : 'bg-amber-700 hover:bg-amber-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PlannedModuleWorkspaceProps {
  moduleCode: ModuleCode;
  language: AppLanguage;
  contextName?: string;
  initialSubTab?: string;
  extraColumns?: Array<{ ar: string; fr: string }>;
  linkedActionLabel?: string;
  onLinkedAction?: () => void;
}

export function PlannedModuleWorkspace({
  moduleCode,
  language,
  contextName,
  initialSubTab,
  extraColumns,
  linkedActionLabel,
  onLinkedAction,
}: PlannedModuleWorkspaceProps) {
  const isArabic = language === 'ar';
  const def = getModuleDefinition(moduleCode);
  const [selectedSubId, setSelectedSubId] = useState<string>(
    initialSubTab ?? def.subScreens[0]?.id ?? 'workspace'
  );

  useEffect(() => {
    setSelectedSubId(initialSubTab ?? def.subScreens[0]?.id ?? 'workspace');
  }, [moduleCode, initialSubTab, def.subScreens]);

  const activeSub = def.subScreens.find((s) => s.id === selectedSubId) ?? def.subScreens[0];

  return (
    <div className="space-y-5">
      {/* Architecture boundary & legal readiness notice */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3.5 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Clock className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <div className="font-semibold">
              {isArabic
                ? `وحدة مخططة — ${def.title.ar}${contextName ? ` · ${contextName}` : ''}`
                : `Module planifié — ${def.title.fr}${contextName ? ` · ${contextName}` : ''}`}
            </div>
            <p className="text-amber-900/90 leading-relaxed">{def.scopeNote[language]}</p>
            {def.prerequisites && (
              <p className="text-[11px] text-amber-800 flex items-start gap-1.5 pt-0.5">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{def.prerequisites[language]}</span>
              </p>
            )}
          </div>
        </div>
        {linkedActionLabel && onLinkedAction && (
          <button
            type="button"
            onClick={onLinkedAction}
            className="shrink-0 rounded border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            {linkedActionLabel}
          </button>
        )}
      </div>

      {/* Interactive sub-screen selector covering every ERP sub-module */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 pt-3 flex flex-wrap gap-1.5">
          {def.subScreens.map((sub) => {
            const active = sub.id === activeSub?.id;
            return (
              <button
                key={sub.id}
                type="button"
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">{activeSub.label[language]}</h2>
                <p className="text-xs text-slate-600 mt-1">{def.summary[language]}</p>
              </div>
              <ModuleStateTag state={activeSub.state} language={language} moduleCode={def.code} />
            </div>
          )}

          {/* Neutral planned structure preview without fake data or misleading action buttons */}
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/60 p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Layers3 className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>
                {isArabic
                  ? 'نطاق الواجهة المستقبلي والضوابط المطلوبة قبل تفعيل الخادم'
                  : 'Périmètre d’interface cible et contrôles requis avant activation serveur'}
              </span>
            </div>

            {extraColumns && extraColumns.length > 0 && (
              <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                <table className="w-full text-xs text-start border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                      {extraColumns.map((col, idx) => (
                        <th key={idx} className="px-3 py-2.5 text-start font-semibold whitespace-nowrap">
                          {isArabic ? col.ar : col.fr}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={extraColumns.length} className="px-4 py-8 text-center text-slate-500">
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
              {def.subScreens.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckSquare className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="truncate font-medium text-slate-800">{sub.label[language]}</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 shrink-0">
                    {getModuleStateLabel(sub.state, language)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
