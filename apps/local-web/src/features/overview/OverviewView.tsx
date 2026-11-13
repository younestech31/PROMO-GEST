import { ArrowLeft, ArrowRight, CheckCircle2, Database, FolderKanban, ShieldCheck, Users } from 'lucide-react';
import type { AppLanguage, HealthStatusResponse, ProjectDto, SessionResponse } from '../../types/erp';
import { getTranslations } from '../../localization/translations';
import { formatDzd, formatLocalDateTime } from '../../utils/algerianFormat';
import { canManageUsers, canViewAuditLogs } from '../../utils/permissions';
import type { ErpRoute } from '../../layouts/ErpShellLayout';

interface OverviewViewProps {
  session: SessionResponse;
  language: AppLanguage;
  health: HealthStatusResponse | null;
  projects: ProjectDto[];
  onNavigate: (route: ErpRoute) => void;
}

export function OverviewView({
  session,
  language,
  health,
  projects,
  onNavigate,
}: OverviewViewProps) {
  const t = getTranslations(language);
  const DirectionArrow = language === 'ar' ? ArrowLeft : ArrowRight;

  const domainModules = [
    {
      ar: 'المشاريع العقارية والعمارات والطوابق',
      fr: 'Projets immobiliers, blocs, étages et lots (appartements, commerces, parkings)',
      statusAr: 'الركيزة الأولى مفعّلة (المشاريع والصلاحيات)',
      statusFr: 'Socle Phase 1 actif (Projets & habilitations)',
    },
    {
      ar: 'الزبائن، الحجوزات، وعقود البيع (DZD)',
      fr: 'Clients, réservations, ventes et échéanciers en DZD',
      statusAr: 'المرحلة الهندسية القادمة',
      statusFr: 'Prochain jalon d\'ingénierie',
    },
    {
      ar: 'متابعة الأشغال، التسليم، وخدمات ما بعد البيع',
      fr: 'Avancement chantier, livraisons et suivi après-vente',
      statusAr: 'مخطط في البنية المعيارية',
      statusFr: 'Préparé dans l\'architecture modulaire',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.overview.title}</h1>
        <p className="text-sm text-slate-600 mt-1">{t.overview.subtitle}</p>
      </div>

      {/* Top 3 Operational & Health Foundation Cards — Real data only */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Identity */}
        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-xs font-semibold text-slate-500 mb-3">
            {t.overview.orgIdentityHeading}
          </h2>
          <p className="text-base font-bold text-slate-900">{session.organization.legalName}</p>
          <p className="text-xs text-slate-600 mt-1">
            {session.organization.legalForm} · {session.organization.wilayaCode} {session.organization.wilayaName}
          </p>
          <dl className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">NIF</dt>
              <dd className="font-data text-slate-900">{session.organization.nif ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">RC</dt>
              <dd className="font-data text-slate-900">
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

        {/* System Health */}
        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-xs font-semibold text-slate-500 mb-3">
            {t.overview.systemHealthHeading}
          </h2>
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{health?.previewMode || health?.databaseConnected ? t.serverConnected : t.serverDisconnected}</span>
          </div>
          <dl className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.overview.databaseEngine}</span>
              </dt>
              <dd className="font-data text-slate-900">
                {health?.previewMode
                  ? (language === 'ar' ? 'ذاكرة مؤقتة · بيانات تجريبية' : 'Mémoire temporaire · Démo')
                  : `PostgreSQL 18 · ${health?.databaseConnected ? 'OK' : 'OFFLINE'}`}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">{t.overview.apiRuntime}</dt>
              <dd className="font-data text-slate-900">{health?.environmentMode ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">{t.overview.initializationState}</dt>
              <dd className="font-medium text-slate-900">
                {health?.previewMode
                  ? (language === 'ar' ? 'تهيئة تجريبية مؤقتة' : 'Initialisation démo temporaire')
                  : health?.isInitialized ? t.overview.initializedYes : '—'}
              </dd>
            </div>
          </dl>
        </section>

        {/* Current User Scope */}
        <section className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-xs font-semibold text-slate-500 mb-3">
            {t.overview.foundationReadinessHeading}
          </h2>
          <div className="text-2xl font-bold font-data text-slate-900">{projects.length}</div>
          <p className="text-xs text-slate-600 mt-0.5">{t.overview.accessibleProjectsCount}</p>

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

      {/* Quick Operational Actions */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">{t.overview.quickActionsHeading}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-start hover:border-teal-700 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FolderKanban className="w-4 h-4 text-teal-800 shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium text-slate-900 truncate">
                {t.overview.goToProjects}
              </span>
            </div>
            <DirectionArrow className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          </button>

          {canManageUsers(session.user) && (
            <button
              type="button"
              onClick={() => onNavigate('users')}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-start hover:border-teal-700 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Users className="w-4 h-4 text-teal-800 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-900 truncate">
                  {t.overview.goToUsers}
                </span>
              </div>
              <DirectionArrow className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </button>
          )}

          {canViewAuditLogs(session.user) && (
            <button
              type="button"
              onClick={() => onNavigate('audit')}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 text-start hover:border-teal-700 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ShieldCheck className="w-4 h-4 text-teal-800 shrink-0" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-900 truncate">
                  {t.overview.goToAudit}
                </span>
              </div>
              <DirectionArrow className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      {/* Algerian Real Estate ERP Structural Scope */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">{t.overview.domainRoadmapHeading}</h2>
        <div className="divide-y divide-slate-100">
          {domainModules.map((mod, idx) => (
            <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-sm font-medium text-slate-900">
                {language === 'ar' ? mod.ar : mod.fr}
              </span>
              <span className="text-xs text-slate-500">
                {language === 'ar' ? mod.statusAr : mod.statusFr}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
