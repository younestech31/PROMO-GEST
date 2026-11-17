import { useEffect, useState } from 'react';
import type { AppLanguage, ProjectDto, SessionResponse } from '../types/erp';
import { getTranslations } from '../core/localization/translations';
import { apiClient } from '../core/api/apiClient';
import {
  DEFAULT_APP_ROUTE,
  buildAppPath,
  canAccessRoute,
  getDeniedRouteNotice,
  parseAppLocation,
  shouldIgnoreGlobalShortcut,
} from './routeRegistry';
import { loadProjectNavigationPreferences, saveProjectNavigationPreferences } from '../shared/utils/navigationPreferences';
import { useUnsavedGuard } from '../shared/hooks/useUnsavedGuard';
import { ErpShellLayout } from './ErpShellLayout';
import { LoginScreen, authApi } from '../modules/auth';
import { FirstRunSetupWizard, setupApi } from '../modules/setup';
import { OverviewView } from '../features/overview/OverviewView';
import { OrganizationProfileView, TerritorialReferenceView, EmployeesPlannedView } from '../modules/module-a-organization';
import { ProjectsAccessView, ProjectWorkspaceView, ProjectSwitcherModal } from '../modules/module-b-projects';
import { PartiesDirectoryView } from '../modules/module-d-customers-parties';
import { UsersManagementView, AuditLogView, SystemDiagnosticsView } from '../modules/technical-admin';
import { ReportsWorkspaceView } from '../modules/module-l-reporting';

export function AppContentRouter({
  session,
  language,
  projects,
  activeRoute,
  onNavigate,
  onOpenSwitcher,
  onProjectUpdated: _onProjectUpdated,
}: {
  session: SessionResponse;
  language: AppLanguage;
  projects: ProjectDto[];
  activeRoute: ReturnType<typeof parseAppLocation>;
  onNavigate: (route: ReturnType<typeof parseAppLocation>) => void;
  onOpenSwitcher: () => void;
  onProjectUpdated: (project: ProjectDto) => void;
}) {
  const [deniedNotice, setDeniedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!canAccessRoute(session.user, activeRoute)) {
      setDeniedNotice(getDeniedRouteNotice(activeRoute, language));
      onNavigate(DEFAULT_APP_ROUTE);
    } else {
      setDeniedNotice(null);
    }
  }, [session.user, activeRoute, language, onNavigate]);

  return (
    <div className="space-y-4">
      {deniedNotice && (
        <div role="alert" className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          {deniedNotice}
        </div>
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'workspace' && (
        <OverviewView
          session={session}
          language={language}
          projects={projects}
          preferences={loadProjectNavigationPreferences(session.user.id)}
          onNavigate={onNavigate}
          onOpenSwitcher={onOpenSwitcher}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'projects' && (
        <ProjectsAccessView
          language={language}
          currentUser={session.user}
          onSelectProject={(proj) => onNavigate({ kind: 'project', projectId: proj.id, section: 'overview' })}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'organizationProfile' && (
        <OrganizationProfileView
          organization={session.organization}
          language={language}
          canManage={Boolean(session.user.isSystemAdministrator || session.user.permissions.includes('organization.manage'))}
          onUpdated={(updated) => {
            session.organization = updated;
          }}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'parties' && (
        <PartiesDirectoryView
          language={language}
          onNavigateHome={() => onNavigate({ kind: 'org', section: 'workspace' })}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'territorialReference' && (
        <TerritorialReferenceView
          language={language}
          onNavigateHome={() => onNavigate({ kind: 'org', section: 'workspace' })}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'employees' && (
        <EmployeesPlannedView
          currentUser={session.user}
          language={language}
          onNavigateHome={() => onNavigate({ kind: 'org', section: 'workspace' })}
          onNavigateUsersAdmin={() => onNavigate({ kind: 'admin', section: 'users' })}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'reports' && (
        <ReportsWorkspaceView session={session} language={language} />
      )}

      {activeRoute.kind === 'project' && (
        <ProjectWorkspaceView
          projectId={activeRoute.projectId}
          section={activeRoute.section}
          currentUser={session.user}
          language={language}
          onNavigateSection={(sec) => onNavigate({ kind: 'project', projectId: activeRoute.projectId, section: sec as never })}
          onOpenSwitcher={onOpenSwitcher}
          onBrowseDirectory={() => onNavigate({ kind: 'org', section: 'projects' })}
          isPinned={loadProjectNavigationPreferences(session.user.id).pinnedProjectIds.includes(activeRoute.projectId)}
          onTogglePin={() => {
            const userId = session.user.id;
            const prefs = loadProjectNavigationPreferences(userId);
            const exists = prefs.pinnedProjectIds.includes(activeRoute.projectId);
            const nextPinned = exists
              ? prefs.pinnedProjectIds.filter((id) => id !== activeRoute.projectId)
              : [activeRoute.projectId, ...prefs.pinnedProjectIds];
            saveProjectNavigationPreferences(userId, { ...prefs, pinnedProjectIds: nextPinned });
          }}
        />
      )}

      {activeRoute.kind === 'admin' && activeRoute.section === 'users' && (
        <UsersManagementView language={language} />
      )}

      {activeRoute.kind === 'admin' && activeRoute.section === 'audit' && (
        <AuditLogView language={language} />
      )}

      {activeRoute.kind === 'admin' && activeRoute.section === 'diagnostics' && (
        <SystemDiagnosticsView language={language} health={null} />
      )}
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [setupState, setSetupState] = useState<{ isInitialized: boolean; requiresBootstrapToken?: boolean } | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [activeRoute, setActiveRoute] = useState<ReturnType<typeof parseAppLocation>>(() =>
    parseAppLocation(typeof window !== 'undefined' ? window.location.pathname : '/')
  );
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [isDirty] = useState(false);

  useUnsavedGuard(isDirty);

  useEffect(() => {
    let active = true;
    const checkState = async () => {
      try {
        const setup = await setupApi.getSetupStatus();
        if (!active) return;
        setSetupState(setup);

        if (setup.isInitialized) {
          try {
            const currentSession = await authApi.getSession();
            if (!active) return;
            setSession(currentSession);
            try {
              const rows = await apiClient.listProjects();
              if (active) setProjects(rows);
            } catch {
              // Non-fatal if project list fails prior to auth
            }
          } catch {
            if (active) setSession(null);
          }
        }
      } catch {
        // Fallback for preview or offline
      } finally {
        if (active) setLoadingInitial(false);
      }
    };

    void checkState();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActiveRoute(parseAppLocation(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const nextPath = buildAppPath(activeRoute);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
  }, [activeRoute]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        if (!shouldIgnoreGlobalShortcut(event.target as HTMLElement)) {
          event.preventDefault();
          setSwitcherOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const language = session?.user.preferredLanguage ?? session?.organization.defaultLanguage ?? 'ar';

  const handleLanguageChange = (lang: AppLanguage) => {
    if (session) {
      setSession({
        ...session,
        user: { ...session.user, preferredLanguage: lang },
      });
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setSession(null);
    setActiveRoute(DEFAULT_APP_ROUTE);
  };

  const handlePreviewLogin = async () => {
    const demo = await authApi.openPreviewSession();
    setSession(demo);
    const rows = await apiClient.listProjects();
    setProjects(rows);
    setActiveRoute(DEFAULT_APP_ROUTE);
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-data">
        PROMO GEST — Initialisation...
      </div>
    );
  }

  if (!setupState?.isInitialized) {
    return (
      <FirstRunSetupWizard
        language={language}
        onLanguageChange={handleLanguageChange}
        requiresBootstrapToken={setupState?.requiresBootstrapToken}
        isPreviewMode={true}
        onPreviewLogin={handlePreviewLogin}
        onInitialized={async () => {
          const s = await authApi.getSession();
          setSession(s);
          const rows = await apiClient.listProjects();
          setProjects(rows);
          setSetupState({ isInitialized: true });
        }}
      />
    );
  }

  if (!session) {
    return (
      <LoginScreen
        language={language}
        onLanguageChange={handleLanguageChange}
        organizationName={null}
        isPreviewMode={true}
        onPreviewLogin={handlePreviewLogin}
        onLoggedIn={(s) => {
          setSession(s);
          void apiClient.listProjects().then(setProjects);
        }}
      />
    );
  }

  return (
    <ErpShellLayout
      session={session}
      language={language}
      activeRoute={activeRoute}
      activeProject={activeRoute.kind === 'project' ? projects.find((p) => p.id === activeRoute.projectId) ?? null : null}
      onNavigate={setActiveRoute}
      onOpenSwitcher={() => setSwitcherOpen(true)}
      onLanguageChange={handleLanguageChange}
      onLogout={handleLogout}
    >
      <AppContentRouter
        session={session}
        language={language}
        projects={projects}
        activeRoute={activeRoute}
        onNavigate={setActiveRoute}
        onOpenSwitcher={() => setSwitcherOpen(true)}
        onProjectUpdated={(proj) => {
          setProjects((prev) => prev.map((p) => (p.id === proj.id ? proj : p)));
        }}
      />

      <ProjectSwitcherModal
        open={switcherOpen}
        language={language}
        currentProjectId={activeRoute.kind === 'project' ? activeRoute.projectId : null}
        authorizedProjects={projects}
        preferences={loadProjectNavigationPreferences(session.user.id)}
        onSelectProject={(proj) => {
          setSwitcherOpen(false);
          setActiveRoute({ kind: 'project', projectId: proj.id, section: 'overview' });
        }}
        onBrowseDirectory={() => {
          setSwitcherOpen(false);
          setActiveRoute({ kind: 'org', section: 'projects' });
        }}
        onClose={() => setSwitcherOpen(false)}
      />
    </ErpShellLayout>
  );
}

export { ContractsModulePage } from '../modules/module-f-contracts';
export { FinanceModulePage } from '../modules/module-g-finance';
export { ConstructionModulePage } from '../modules/module-h-construction';
export { ProcurementModulePage } from '../modules/module-i-procurement';
export { AccountingModulePage } from '../modules/module-j-accounting';

export default App;

