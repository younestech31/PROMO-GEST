import { useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Building2,
  CalendarClock,
  Coins,
  FileSignature,
  FileText,
  FolderKanban,
  HardHat,
  Layers3,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Package,
  Scale,
  Settings,
  Settings2,
  ShieldAlert,
  UserCheck,
  Users,
  Users2,
  UsersRound,
  X,
} from 'lucide-react';
import type { AppLanguage, ProjectDto, SessionResponse } from '../types/erp';
import { getTranslations } from '../localization/translations';
import {
  canManageUsers,
  canReadPartyDirectory,
  canViewAuditLogs,
  canViewTechnicalAdmin,
} from '../utils/permissions';
import {
  isSameRoute,
  type AppRouteState,
  type ProjectWorkspaceSection,
} from '../utils/navigation';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface ErpShellLayoutProps {
  session: SessionResponse;
  language: AppLanguage;
  activeRoute: AppRouteState;
  activeProject: ProjectDto | null;
  onNavigate: (route: AppRouteState) => void;
  onOpenSwitcher: () => void;
  onLanguageChange: (lang: AppLanguage) => void;
  onLogout: () => void;
  children: ReactNode;
}

const PROJECT_NAV_ITEMS: Array<{
  section: ProjectWorkspaceSection;
  ar: string;
  fr: string;
  code: string;
  planned?: boolean;
  icon: typeof LayoutDashboard;
}> = [
  { section: 'overview', ar: 'نظرة المشروع', fr: 'Aperçu projet', code: 'B', icon: LayoutDashboard },
  { section: 'structure', ar: 'الهيكل والوحدات', fr: 'Structure & Lots', code: 'C', icon: Layers3 },
  { section: 'customers', ar: 'الزبائن والمهتمون', fr: 'Clients & CRM', code: 'D', icon: UsersRound },
  { section: 'reservations', ar: 'الحجوزات الداخلية', fr: 'Réservations', code: 'E', icon: CalendarClock },
  { section: 'documents', ar: 'الوثائق (K-Min)', fr: 'Documents (K-Min)', code: 'K', icon: FileText },
  { section: 'reports', ar: 'تقارير المشروع', fr: 'Rapports projet', code: 'L', icon: BarChart3 },
  { section: 'settings', ar: 'الإعدادات والفريق', fr: 'Paramètres & Équipe', code: 'B', icon: Settings },
  { section: 'contracts', ar: 'العقود', fr: 'Contrats', code: 'F', planned: true, icon: FileSignature },
  { section: 'finance', ar: 'التحصيل والأقساط', fr: 'Finances', code: 'G', planned: true, icon: Coins },
  { section: 'construction', ar: 'الأشغال والورشة', fr: 'Chantier', code: 'H', planned: true, icon: HardHat },
  { section: 'procurement', ar: 'المشتريات والمخزون', fr: 'Achats & Stocks', code: 'I', planned: true, icon: Package },
  { section: 'accounting', ar: 'المحاسبة SCF', fr: 'Comptabilité SCF', code: 'J', planned: true, icon: Scale },
];

export function ErpShellLayout({
  session,
  language,
  activeRoute,
  activeProject,
  onNavigate,
  onOpenSwitcher,
  onLanguageChange,
  onLogout,
  children,
}: ErpShellLayoutProps) {
  const isArabic = language === 'ar';
  const t = getTranslations(language);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showUsers = canManageUsers(session.user);
  const showAudit = canViewAuditLogs(session.user);
  const showTechAdmin = canViewTechnicalAdmin(session.user);
  const showParties = canReadPartyDirectory(session.user);

  const navButtonClass = (route: AppRouteState) => {
    const active = isSameRoute(activeRoute, route);
    return `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors text-start focus-visible:outline-2 focus-visible:outline-teal-400 ${
      active
        ? 'bg-teal-800 text-white'
        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
    }`;
  };

  const handleSelectRoute = (route: AppRouteState) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <div className="px-5 py-4 border-b border-slate-800">
        <button
          type="button"
          onClick={() => handleSelectRoute({ kind: 'org', section: 'workspace' })}
          className="w-full flex items-center gap-2.5 text-start"
        >
          <div className="w-8 h-8 rounded-md bg-teal-700 text-white flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-white truncate">
              {t.appTitle}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {session.organization.legalName}
            </div>
          </div>
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Main navigation">
        {/* Context 1: Organization Workspace */}
        <div>
          <p className="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {isArabic ? 'مساحة المؤسسة' : 'Organisation'}
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleSelectRoute({ kind: 'org', section: 'workspace' })}
              className={navButtonClass({ kind: 'org', section: 'workspace' })}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t.nav.overview}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRoute({ kind: 'org', section: 'projects' })}
              className={navButtonClass({ kind: 'org', section: 'projects' })}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <FolderKanban className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t.nav.projects}</span>
              </span>
            </button>

            {showParties && (
              <button
                type="button"
                onClick={() => handleSelectRoute({ kind: 'org', section: 'parties' })}
                className={navButtonClass({ kind: 'org', section: 'parties' })}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Users2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{isArabic ? 'دليل الأطراف' : 'Tiers (Parties)'}</span>
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSelectRoute({ kind: 'org', section: 'organizationProfile' })}
              className={navButtonClass({ kind: 'org', section: 'organizationProfile' })}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Settings2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t.nav.organization}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRoute({ kind: 'org', section: 'territorialReference' })}
              className={navButtonClass({ kind: 'org', section: 'territorialReference' })}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{isArabic ? 'الولايات (69)' : 'Wilayas (69)'}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRoute({ kind: 'org', section: 'employees' })}
              className={navButtonClass({ kind: 'org', section: 'employees' })}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{isArabic ? 'الموظفون (HR)' : 'Employés (RH)'}</span>
              </span>
              <span className="text-[10px] text-amber-300 shrink-0">
                {isArabic ? 'مخطط' : 'Planifié'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectRoute({ kind: 'org', section: 'reports' })}
              className={navButtonClass({ kind: 'org', section: 'reports' })}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{isArabic ? 'التقارير والرقابة' : 'Rapports'}</span>
              </span>
            </button>
          </div>
        </div>

        {/* Context 3: Active Project Navigation (explicitly scoped to active project route) */}
        {activeRoute.kind === 'project' && (
          <div className="pt-3 border-t border-slate-800">
            <div className="px-3 mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider">
                  {isArabic ? 'المشروع النشط' : 'Projet actif'}
                </p>
                <p dir="ltr" className="font-data text-xs font-bold text-white truncate">
                  {activeProject?.code ?? activeRoute.projectId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSwitcher();
                }}
                className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
              >
                {isArabic ? 'تبديل' : 'Changer'}
              </button>
            </div>

            <div className="space-y-1">
              {PROJECT_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const route: AppRouteState = {
                  kind: 'project',
                  projectId: activeRoute.projectId,
                  section: item.section,
                };
                return (
                  <button
                    key={item.section}
                    type="button"
                    onClick={() => handleSelectRoute(route)}
                    className={navButtonClass(route)}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{isArabic ? item.ar : item.fr}</span>
                    </span>
                    {item.planned && (
                      <span className="text-[10px] text-amber-300 shrink-0">
                        {isArabic ? 'مخطط' : 'Planifié'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Context 4: Separated Technical Administration */}
        {showTechAdmin && (
          <div className="pt-3 border-t border-slate-800">
            <p className="px-3 mb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t.nav.sectionAdministration}
            </p>
            <div className="space-y-1">
              {showUsers && (
                <button
                  type="button"
                  onClick={() => handleSelectRoute({ kind: 'admin', section: 'users' })}
                  className={navButtonClass({ kind: 'admin', section: 'users' })}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{t.nav.users}</span>
                  </span>
                </button>
              )}
              {showAudit && (
                <button
                  type="button"
                  onClick={() => handleSelectRoute({ kind: 'admin', section: 'audit' })}
                  className={navButtonClass({ kind: 'admin', section: 'audit' })}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{t.nav.audit}</span>
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSelectRoute({ kind: 'admin', section: 'diagnostics' })}
                className={navButtonClass({ kind: 'admin', section: 'diagnostics' })}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{isArabic ? 'تشخيص النظام' : 'Diagnostics système'}</span>
                </span>
              </button>
            </div>
          </div>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800 bg-slate-950/50">
        <div className="text-xs font-semibold text-white truncate">{session.user.fullName}</div>
        <div className="text-xs text-slate-400 truncate mt-0.5">
          <span className="font-data">{session.user.username}</span> ·{' '}
          <span>
            {session.user.isSystemAdministrator ? t.users.sysAdminLabel : session.user.roles.join(', ')}
          </span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{t.auth.signOut}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-e border-slate-800">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 max-w-[85vw] h-full shadow-xl">{sidebarContent}</div>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className="flex-1 bg-slate-950/50"
          />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                className="lg:hidden p-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">
                  {session.organization.legalName}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {session.organization.legalForm} · <span className="font-data">{session.organization.wilayaCode}</span>{' '}
                  {session.organization.wilayaName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenSwitcher}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-teal-700 hover:bg-white transition-colors"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-teal-800 shrink-0" aria-hidden="true" />
                <span className="max-w-[180px] truncate">
                  {activeRoute.kind === 'project' && activeProject
                    ? `${activeProject.code} · ${isArabic ? activeProject.nameAr : activeProject.nameFr}`
                    : (isArabic ? 'تبديل / فتح مشروع' : 'Changer de projet')}
                </span>
                <kbd className="hidden sm:inline-block rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-data text-slate-500">
                  Ctrl+K
                </kbd>
              </button>

              <LanguageSwitcher language={language} onChange={onLanguageChange} />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
