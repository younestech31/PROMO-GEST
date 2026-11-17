import { BarChart3, ShieldAlert } from 'lucide-react';
import type { AppLanguage, AuthenticatedUser, ProjectDto } from '@/types/erp';
import { formatDzd } from '@/utils/algerianFormat';
import { canViewAuditLogs } from '@/core/permissions/permissionPolicy';
import { PageHeader } from '@/components/PageHeader';
import { PlannedModuleWorkspace } from '@/components/StateViews';
import { formatProjectStatus } from '@/components/ProjectIdentityStrip';

interface ReportsWorkspaceViewProps {
  currentUser: AuthenticatedUser;
  language: AppLanguage;
  projects: ProjectDto[];
  projectContext?: ProjectDto | null;
  onNavigateHome: () => void;
  onNavigateAudit: () => void;
  onOpenProjectWorkspace: (projectId: string) => void;
}

export function ReportsWorkspaceView({
  currentUser,
  language,
  projects,
  projectContext,
  onNavigateHome,
  onNavigateAudit,
  onOpenProjectWorkspace,
}: ReportsWorkspaceViewProps) {
  const isArabic = language === 'ar';
  const showAudit = canViewAuditLogs(currentUser);
  const scopeProjects = projectContext ? [projectContext] : projects;

  const totalBuildings = scopeProjects.reduce((sum, p) => sum + p.actualBuildingsCount, 0);
  const totalUnits = scopeProjects.reduce((sum, p) => sum + p.actualUnitsCount, 0);
  const visibleBudgetProjects = scopeProjects.filter((p) => p.estimatedBudgetDzd !== null);
  const allBudgetsVisible =
    scopeProjects.length > 0 && visibleBudgetProjects.length === scopeProjects.length;
  const visibleBudgetTotal = allBudgetsVisible
    ? visibleBudgetProjects.reduce((sum, p) => sum + (p.estimatedBudgetDzd ?? 0), 0)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          projectContext
            ? (isArabic ? `تقارير المشروع — ${projectContext.code}` : `Rapports projet — ${projectContext.code}`)
            : (isArabic ? 'التقارير ولوحات الرقابة' : 'Reporting & Contrôle')
        }
        subtitle={
          isArabic
            ? 'ملخص المؤشرات الفعلية ضمن النطاق المصرح به، وهيكلة التقارير التشغيلية والمحاسبية القادمة.'
            : 'Indicateurs réels dans le périmètre autorisé et structure des états commerciaux, chantiers et SCF planifiés.'
        }
        language={language}
        moduleCode="L"
        moduleState="PARTIALLY_IMPLEMENTED"
        breadcrumbs={
          projectContext
            ? undefined
            : [
                { label: isArabic ? 'مساحة المؤسسة' : 'Organisation', onClick: onNavigateHome },
                { label: isArabic ? 'التقارير والرقابة' : 'Rapports' },
              ]
        }
        actions={
          showAudit ? (
            <button
              type="button"
              onClick={onNavigateAudit}
              className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ShieldAlert className="h-3.5 w-3.5 text-teal-800" aria-hidden="true" />
              <span>{isArabic ? 'سجل التدقيق الأمني' : 'Journal d’audit'}</span>
            </button>
          ) : undefined
        }
      />

      {/* Real authorized counts only */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500">
            {isArabic ? 'المشاريع في النطاق' : 'Projets dans le périmètre'}
          </div>
          <div className="mt-2 text-2xl font-bold font-data text-slate-900">{scopeProjects.length}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500">
            {isArabic ? 'العمارات / الوحدات المسجلة فعلياً' : 'Bâtiments / Unités enregistrés'}
          </div>
          <div className="mt-2 text-2xl font-bold font-data text-slate-900">
            {totalBuildings} <span className="text-sm font-normal text-slate-500">/ {totalUnits}</span>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-xs font-semibold text-slate-500">
            {isArabic ? 'إجمالي الميزانية المصرح برؤيتها' : 'Budget total autorisé'}
          </div>
          <div className="mt-2 text-xl font-bold font-data text-slate-900">
            {visibleBudgetTotal !== null ? formatDzd(visibleBudgetTotal, language) : '—'}
          </div>
          {visibleBudgetTotal === null && scopeProjects.length > 0 && (
            <p className="mt-1 text-[11px] text-slate-500">
              {isArabic
                ? 'محجوب جزئياً: بعض المشاريع لا تمنحك صلاحية العرض المالي (canViewFinancials).'
                : 'Partiellement masqué selon la règle canViewFinancials par projet.'}
            </p>
          )}
        </div>
      </div>

      {!projectContext && scopeProjects.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center gap-2 text-sm font-bold text-slate-900">
            <BarChart3 className="h-4 w-4 text-teal-800" aria-hidden="true" />
            <span>{isArabic ? 'ملخص المشاريع المصرح بها' : 'Synthèse des projets autorisés'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="py-2.5 px-4 text-start">{isArabic ? 'الرمز' : 'Code'}</th>
                  <th className="py-2.5 px-4 text-start">{isArabic ? 'المشروع' : 'Projet'}</th>
                  <th className="py-2.5 px-4 text-start">{isArabic ? 'الحالة' : 'Statut'}</th>
                  <th className="py-2.5 px-4 text-end">{isArabic ? 'العمارات (فعلي / مخطط)' : 'Bâtiments (réel / prévu)'}</th>
                  <th className="py-2.5 px-4 text-end">{isArabic ? 'الوحدات (فعلي / مخطط)' : 'Unités (réelles / prévues)'}</th>
                  <th className="py-2.5 px-4 text-end">{isArabic ? 'الميزانية' : 'Budget'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopeProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-data font-bold text-teal-900" dir="ltr">
                      <button
                        type="button"
                        onClick={() => onOpenProjectWorkspace(project.id)}
                        className="hover:underline"
                      >
                        {project.code}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {isArabic ? project.nameAr : project.nameFr}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{formatProjectStatus(project.status, language)}</td>
                    <td className="py-2.5 px-4 text-end font-data">
                      {project.actualBuildingsCount} / {project.plannedBlocksCount}
                    </td>
                    <td className="py-2.5 px-4 text-end font-data">
                      {project.actualUnitsCount} / {project.plannedUnitsCount}
                    </td>
                    <td className="py-2.5 px-4 text-end font-data">
                      {project.estimatedBudgetDzd === null ? '—' : formatDzd(project.estimatedBudgetDzd, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <PlannedModuleWorkspace
        moduleCode="L"
        language={language}
        contextName={projectContext ? projectContext.code : undefined}
        initialSubTab="sales-rep"
        extraColumns={[
          { ar: 'التقرير', fr: 'État' },
          { ar: 'المرجع القانوني / المحاسبي', fr: 'Référence métier' },
          { ar: 'الفترة / المشروع', fr: 'Période / Projet' },
          { ar: 'حالة التصدير', fr: 'Statut export' },
        ]}
      />
    </div>
  );
}
