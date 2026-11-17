import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  FolderKanban,
  MapPin,
  Pin,
  ShieldCheck,
  Users,
  Users2,
} from 'lucide-react';
import type { AppLanguage, ProjectDto, SessionResponse } from '../../types/erp';
import { getTranslations } from '../../localization/translations';
import { formatDzd, formatLocalDateTime } from '../../utils/algerianFormat';
import {
  canManageUsers,
  canReadPartyDirectory,
  canViewAuditLogs,
} from '../../utils/permissions';
import {
  filterAuthorizedPreferenceIds,
  type AppRouteState,
  type ProjectNavigationPreferences,
} from '../../utils/navigation';
import { ERP_MODULE_CATALOG } from '../../utils/moduleCatalog';
import { ModuleStateTag, PageHeader } from '../../components/PageHeader';
import { formatProjectStatus } from '../../components/ProjectIdentityStrip';

interface OverviewViewProps {
  session: SessionResponse;
  language: AppLanguage;
  projects: ProjectDto[];
  preferences: ProjectNavigationPreferences;
  onNavigate: (route: AppRouteState) => void;
  onOpenSwitcher: () => void;
}

export function OverviewView({
  session,
  language,
  projects,
  preferences,
  onNavigate,
  onOpenSwitcher,
}: OverviewViewProps) {
  const isArabic = language === 'ar';
  const t = getTranslations(language);
  const DirectionArrow = isArabic ? ArrowLeft : ArrowRight;

  const pinnedProjects = filterAuthorizedPreferenceIds(preferences.pinnedProjectIds, projects);
  const pinnedIds = new Set(pinnedProjects.map((p) => p.id));
  const recentProjects = filterAuthorizedPreferenceIds(preferences.recentProjectIds, projects).filter(
    (p) => !pinnedIds.has(p.id)
  );
  const continueProjects = [...pinnedProjects, ...recentProjects, ...projects.filter(
    (p) => !pinnedIds.has(p.id) && !recentProjects.some((r) => r.id === p.id)
  )].slice(0, 4);

  const primaryProjectId = continueProjects[0]?.id ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.overview.title}
        subtitle={
          isArabic
            ? 'المركز اليومي للمؤسسة: المشاريع المصرح بها، دليل الأطراف، المرجع الإقليمي وخارطة وحدات PROMO GEST.'
            : 'Espace quotidien de l’organisation : projets autorisés, répertoire des tiers, référentiel territorial et couverture modulaire A–L.'
        }
        language={language}
      />

      {/* Top 2 Real Operational Cards (System Health moved cleanly to Technical Admin /admin/diagnostics) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-xs font-semibold text-slate-500">
              {t.overview.orgIdentityHeading}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate({ kind: 'org', section: 'organizationProfile' })}
              className="text-xs font-semibold text-teal-800 hover:underline"
            >
              {isArabic ? 'عرض الملف' : 'Voir le profil'}
            </button>
          </div>
          <p className="text-base font-bold text-slate-900">{session.organization.legalName}</p>
          <p className="text-xs text-slate-600 mt-1">
            {session.organization.legalForm} · <span className="font-data">{session.organization.wilayaCode}</span>{' '}
            {session.organization.wilayaName}
          </p>
          <dl className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">NIF</dt>
              <dd className="font-data text-slate-900" dir="ltr">{session.organization.nif ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">RC</dt>
              <dd className="font-data text-slate-900" dir="ltr">
                {session.organization.tradeRegisterNumber ?? '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">{t.setup.capitalDzd}</dt>
              <dd className="font-data text-slate-900">
                {formatDzd(session.organization.shareCapitalDzd, language)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-xs font-semibold text-slate-500 mb-3">
            {t.overview.foundationReadinessHeading}
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold font-data text-slate-900">{projects.length}</span>
            <span className="text-xs text-slate-600">{t.overview.accessibleProjectsCount}</span>
          </div>

          <dl className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">{t.overview.activeSessionUser}</dt>
              <dd className="font-medium text-slate-900">{session.user.fullName}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">{t.users.tableRoles}</dt>
              <dd className="font-medium text-slate-900">
                {session.user.isSystemAdministrator
                  ? t.users.sysAdminLabel
                  : session.user.roles.join(', ')}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">{t.users.tableLastLogin}</dt>
              <dd className="font-data text-slate-900">
                {formatLocalDateTime(session.user.lastLoginAtUtc, language)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Continue in Project — explicit selection, never auto-entered */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {isArabic ? 'المتابعة في مشروع عقاري' : 'Continuer dans un projet'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isArabic
                ? 'اختر مشروعاً من قائمة صلاحياتك الفعلية أو استخدم مبدّل المشاريع الصريح.'
                : 'Sélectionnez explicitement un projet autorisé ou ouvrez le sélecteur rapide.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSwitcher}
              className="rounded border border-teal-700 bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900"
            >
              {isArabic ? 'مبدّل المشروع (Ctrl+K)' : 'Sélecteur projet (Ctrl+K)'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ kind: 'org', section: 'projects' })}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isArabic ? 'كل المشاريع' : 'Tous les projets'}
            </button>
          </div>
        </div>

        {continueProjects.length === 0 ? (
          <div className="rounded border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500">
            {t.projects.emptyTitle} — {t.projects.emptyBody}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {continueProjects.map((project) => {
              const isPinned = pinnedIds.has(project.id);
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onNavigate({ kind: 'project', projectId: project.id, section: 'overview' })}
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-start hover:border-teal-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span dir="ltr" className="font-data text-xs font-bold text-teal-900">
                        {project.code}
                      </span>
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {isArabic ? project.nameAr : project.nameFr}
                      </span>
                      {isPinned && <Pin className="h-3 w-3 text-teal-700 shrink-0" aria-hidden="true" />}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      <span className="font-data">{project.wilayaCode}</span> {project.wilayaName} ·{' '}
                      {formatProjectStatus(project.status, language)} ·{' '}
                      <span className="font-data">{project.actualUnitsCount}</span>{' '}
                      {isArabic ? 'وحدات' : 'unités'}
                    </div>
                  </div>
                  <DirectionArrow className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Authorized Organization Actions */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">{t.overview.quickActionsHeading}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onNavigate({ kind: 'org', section: 'projects' })}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-start hover:border-teal-700 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FolderKanban className="w-4 h-4 text-teal-800 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-900 truncate">{t.overview.goToProjects}</span>
            </div>
            <DirectionArrow className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          </button>

          {canReadPartyDirectory(session.user) && (
            <button
              type="button"
              onClick={() => onNavigate({ kind: 'org', section: 'parties' })}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-start hover:border-teal-700 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Users2 className="w-4 h-4 text-teal-800 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-900 truncate">
                  {isArabic ? 'دليل الأطراف المركزي' : 'Répertoire des tiers'}
                </span>
              </div>
              <DirectionArrow className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate({ kind: 'org', section: 'territorialReference' })}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-start hover:border-teal-700 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <MapPin className="w-4 h-4 text-teal-800 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-900 truncate">
                {isArabic ? 'المرجع الإقليمي (69 ولاية)' : 'Référentiel 69 wilayas'}
              </span>
            </div>
            <DirectionArrow className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ kind: 'org', section: 'reports' })}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-start hover:border-teal-700 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <BarChart3 className="w-4 h-4 text-teal-800 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-900 truncate">
                {isArabic ? 'التقارير ولوحات الرقابة' : 'Reporting & Contrôle'}
              </span>
            </div>
            <DirectionArrow className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          </button>

          {canManageUsers(session.user) && (
            <button
              type="button"
              onClick={() => onNavigate({ kind: 'admin', section: 'users' })}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-start hover:border-teal-700 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Users className="w-4 h-4 text-teal-800 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-900 truncate">{t.overview.goToUsers}</span>
              </div>
              <DirectionArrow className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </button>
          )}

          {canViewAuditLogs(session.user) && (
            <button
              type="button"
              onClick={() => onNavigate({ kind: 'admin', section: 'audit' })}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-start hover:border-teal-700 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ShieldCheck className="w-4 h-4 text-teal-800 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-900 truncate">{t.overview.goToAudit}</span>
              </div>
              <DirectionArrow className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      {/* Complete A–L Module Coverage Directory */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-teal-800" aria-hidden="true" />
          <h2 className="text-sm font-bold text-slate-900">
            {isArabic ? 'التغطية الشاملة لوحدات PROMO GEST (أ — ل)' : 'Couverture complète des modules PROMO GEST (A–L)'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ERP_MODULE_CATALOG.map((mod) => {
            const targetRoute: AppRouteState | null = mod.orgTargetRoute
              ? mod.orgTargetRoute
              : mod.projectSection && primaryProjectId
                ? { kind: 'project', projectId: primaryProjectId, section: mod.projectSection }
                : mod.projectSection
                  ? { kind: 'org', section: 'projects' }
                  : null;

            return (
              <div
                key={mod.code}
                className="flex flex-col justify-between gap-3 rounded-md border border-slate-200 p-4 hover:border-slate-300"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900 leading-snug">{mod.title[language]}</h3>
                    <ModuleStateTag state={mod.state} language={language} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{mod.summary[language]}</p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500 font-data">
                    {mod.subScreens.length} {isArabic ? 'شاشات' : 'écrans'}
                  </span>
                  {targetRoute && (
                    <button
                      type="button"
                      onClick={() => onNavigate(targetRoute)}
                      className="text-xs font-semibold text-teal-800 hover:underline"
                    >
                      {isArabic ? 'فتح الشاشة' : 'Ouvrir'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
