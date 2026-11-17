import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AppLanguage,
  HealthStatusResponse,
  ProjectDto,
  SessionResponse,
  SetupStatusResponse,
} from '../types/erp';
import { apiClient } from '../services/apiClient';
import { FirstRunSetupWizard } from '../features/setup/FirstRunSetupWizard';
import { LoginScreen } from '../features/auth/LoginScreen';
import { ErpShellLayout } from '../layouts/ErpShellLayout';
import { OverviewView } from '../features/overview/OverviewView';
import { UsersManagementView } from '../features/users/UsersManagementView';
import { ProjectsAccessView } from '../features/projects/ProjectsAccessView';
import { ProjectWorkspaceView } from '../features/projects/ProjectWorkspaceView';
import { AuditLogView } from '../features/audit/AuditLogView';
import { OrganizationProfileView } from '../features/organization/OrganizationProfileView';
import { PartiesDirectoryView } from '../features/organization/PartiesDirectoryView';
import { TerritorialReferenceView } from '../features/organization/TerritorialReferenceView';
import { EmployeesPlannedView } from '../features/organization/EmployeesPlannedView';
import { ReportsWorkspaceView } from '../features/reports/ReportsWorkspaceView';
import { SystemDiagnosticsView } from '../features/admin/SystemDiagnosticsView';
import { ProjectSwitcherModal } from '../components/ProjectSwitcherModal';
import { ConfirmDialog } from '../components/StateViews';
import { getTranslations } from '../localization/translations';
import {
  buildAppPath,
  DEFAULT_APP_ROUTE,
  emptyProjectPreferences,
  isSameRoute,
  loadProjectNavigationPreferences,
  parseAppLocation,
  recordRecentProjectId,
  saveProjectNavigationPreferences,
  togglePinnedProjectId,
  type AppRouteState,
  type ProjectNavigationPreferences,
} from '../utils/navigation';

export function App() {
  const [language, setLanguage] = useState<AppLanguage>('ar');
  const [booting, setBooting] = useState(true);
  const [health, setHealth] = useState<HealthStatusResponse | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatusResponse | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [verifiedProject, setVerifiedProject] = useState<ProjectDto | null>(null);

  const [activeRoute, setActiveRoute] = useState<AppRouteState>(() =>
    typeof window !== 'undefined' ? parseAppLocation(window.location.pathname) : DEFAULT_APP_ROUTE
  );
  const [preferences, setPreferences] = useState<ProjectNavigationPreferences>(() => emptyProjectPreferences());
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<AppRouteState | null>(null);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const navigateTo = useCallback(
    (nextRoute: AppRouteState, options?: { replace?: boolean; bypassDirtyGuard?: boolean }) => {
      if (!options?.bypassDirtyGuard && hasUnsavedChanges && !isSameRoute(activeRoute, nextRoute)) {
        setPendingRoute(nextRoute);
        return;
      }

      setHasUnsavedChanges(false);
      setPendingRoute(null);
      setActiveRoute(nextRoute);
      setSwitcherOpen(false);

      if (typeof window !== 'undefined') {
        const targetPath = buildAppPath(nextRoute);
        if (window.location.pathname !== targetPath) {
          if (options?.replace) {
            window.history.replaceState(null, '', targetPath);
          } else {
            window.history.pushState(null, '', targetPath);
          }
        }
      }
    },
    [hasUnsavedChanges, activeRoute]
  );

  useEffect(() => {
    const handlePopState = () => {
      setActiveRoute(parseAppLocation(window.location.pathname));
      setHasUnsavedChanges(false);
      setPendingRoute(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!session) return;
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSwitcherOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [session]);

  const checkHealthAndBootstrap = useCallback(async () => {
    try {
      const [healthRes, setupRes] = await Promise.all([
        apiClient.healthReady(),
        apiClient.getSetupStatus(),
      ]);
      setHealth(healthRes);
      setSetupStatus(setupRes);

      if (setupRes.defaultLanguage === 'fr' || setupRes.defaultLanguage === 'ar') {
        setLanguage(setupRes.defaultLanguage);
      }

      if (setupRes.isInitialized) {
        try {
          const activeSession = await apiClient.getSession();
          setSession(activeSession);
          setLanguage(activeSession.user.preferredLanguage);
          setPreferences(loadProjectNavigationPreferences(activeSession.user.id));
          const accessibleProjects = await apiClient.listProjects();
          setProjects(accessibleProjects);
        } catch {
          setSession(null);
        }
      } else {
        setSession(null);
      }
    } catch {
      setHealth(null);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void checkHealthAndBootstrap();
  }, [checkHealthAndBootstrap]);

  // Refresh diagnostic health data without promoting one transient probe failure
  // into a global connectivity warning or overlapping slow requests.
  useEffect(() => {
    let requestInFlight = false;
    let disposed = false;

    const timer = window.setInterval(async () => {
      if (requestInFlight || document.visibilityState !== 'visible') return;

      requestInFlight = true;
      try {
        const latestHealth = await apiClient.healthReady();
        if (!disposed) setHealth(latestHealth);
      } catch {
        if (!disposed) setHealth(null);
      } finally {
        requestInFlight = false;
      }
    }, 60_000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, []);

  const handleInitialized = async () => {
    await checkHealthAndBootstrap();
  };

  const handleLoggedIn = async (newSession: SessionResponse) => {
    setSession(newSession);
    setLanguage(newSession.user.preferredLanguage);
    setPreferences(loadProjectNavigationPreferences(newSession.user.id));
    navigateTo(DEFAULT_APP_ROUTE, { replace: true, bypassDirtyGuard: true });
    try {
      const accessibleProjects = await apiClient.listProjects();
      setProjects(accessibleProjects);
    } catch {
      setProjects([]);
    }
  };

  const handleOpenPreview = async () => {
    const previewSession = await apiClient.openPreviewSession();
    setSetupStatus({
      isInitialized: true,
      organizationLegalName: previewSession.organization.legalName,
      defaultLanguage: previewSession.organization.defaultLanguage,
    });
    await handleLoggedIn(previewSession);
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } finally {
      setSession(null);
      setProjects([]);
      setVerifiedProject(null);
      setSwitcherOpen(false);
      setHasUnsavedChanges(false);
      setPendingRoute(null);
      navigateTo(DEFAULT_APP_ROUTE, { replace: true, bypassDirtyGuard: true });
    }
  };

  const handleProjectVerified = useCallback(
    (project: ProjectDto) => {
      setVerifiedProject(project);
      setProjects((prev) => {
        const exists = prev.some((p) => p.id === project.id);
        return exists ? prev.map((p) => (p.id === project.id ? project : p)) : [project, ...prev];
      });
      if (session) {
        setPreferences((prev) => {
          const next = recordRecentProjectId(prev, project.id);
          saveProjectNavigationPreferences(session.user.id, next);
          return next;
        });
      }
    },
    [session]
  );

  const handleProjectVerificationFailed = useCallback(
    (failedProjectId: string) => {
      setVerifiedProject(null);
      if (session) {
        setPreferences((prev) => {
          const next: ProjectNavigationPreferences = {
            recentProjectIds: prev.recentProjectIds.filter((id) => id !== failedProjectId),
            pinnedProjectIds: prev.pinnedProjectIds.filter((id) => id !== failedProjectId),
          };
          saveProjectNavigationPreferences(session.user.id, next);
          return next;
        });
      }
    },
    [session]
  );

  const handleTogglePin = useCallback(
    (projectId: string) => {
      if (!session) return;
      setPreferences((prev) => {
        const next = togglePinnedProjectId(prev, projectId);
        saveProjectNavigationPreferences(session.user.id, next);
        return next;
      });
    },
    [session]
  );

  const activeProject = useMemo(() => {
    if (activeRoute.kind !== 'project') return null;
    if (verifiedProject && verifiedProject.id === activeRoute.projectId) return verifiedProject;
    return projects.find((p) => p.id === activeRoute.projectId) ?? null;
  }, [activeRoute, verifiedProject, projects]);

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900">{getTranslations(language).appTitle}</div>
        </div>
      </div>
    );
  }

  if (setupStatus && !setupStatus.isInitialized) {
    return (
      <FirstRunSetupWizard
        language={language}
        onLanguageChange={setLanguage}
        onInitialized={handleInitialized}
        requiresBootstrapToken={Boolean(setupStatus.requiresBootstrapToken)}
        isPreviewMode={health?.previewMode === true}
        onPreviewLogin={handleOpenPreview}
      />
    );
  }

  if (!session) {
    return (
      <LoginScreen
        language={language}
        onLanguageChange={setLanguage}
        organizationName={setupStatus?.organizationLegalName ?? null}
        onLoggedIn={(s) => void handleLoggedIn(s)}
        isPreviewMode={health?.previewMode === true}
        onPreviewLogin={handleOpenPreview}
      />
    );
  }

  const isArabic = language === 'ar';

  return (
    <ErpShellLayout
      session={session}
      language={language}
      activeRoute={activeRoute}
      activeProject={activeProject}
      onNavigate={(route) => navigateTo(route)}
      onOpenSwitcher={() => setSwitcherOpen(true)}
      onLanguageChange={setLanguage}
      onLogout={() => void handleLogout()}
    >
      {/* Context 1: Organization Workspace */}
      {activeRoute.kind === 'org' && activeRoute.section === 'workspace' && (
        <OverviewView
          session={session}
          language={language}
          projects={projects}
          preferences={preferences}
          onNavigate={(route) => navigateTo(route)}
          onOpenSwitcher={() => setSwitcherOpen(true)}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'projects' && (
        <ProjectsAccessView
          currentUser={session.user}
          language={language}
          onProjectsChanged={setProjects}
          onOpenProjectWorkspace={(projectId) =>
            navigateTo({ kind: 'project', projectId, section: 'overview' })
          }
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'parties' && (
        <PartiesDirectoryView
          currentUser={session.user}
          language={language}
          onNavigateHome={() => navigateTo({ kind: 'org', section: 'workspace' })}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'organizationProfile' && (
        <OrganizationProfileView
          organization={session.organization}
          language={language}
          canManage={
            health?.previewMode !== true &&
            Boolean(
              session.organization.concurrencyStamp &&
              session.organization.concurrencyStamp !== '00000000-0000-0000-0000-000000000000'
            ) &&
            (session.user.isSystemAdministrator ||
              session.user.permissions.includes('org.manage'))
          }
          onUpdated={(organization) =>
            setSession((current) => (current ? { ...current, organization } : current))
          }
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'territorialReference' && (
        <TerritorialReferenceView
          language={language}
          onNavigateHome={() => navigateTo({ kind: 'org', section: 'workspace' })}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'employees' && (
        <EmployeesPlannedView
          currentUser={session.user}
          language={language}
          onNavigateHome={() => navigateTo({ kind: 'org', section: 'workspace' })}
          onNavigateUsersAdmin={() => navigateTo({ kind: 'admin', section: 'users' })}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'reports' && (
        <ReportsWorkspaceView
          currentUser={session.user}
          language={language}
          projects={projects}
          onNavigateHome={() => navigateTo({ kind: 'org', section: 'workspace' })}
          onNavigateAudit={() => navigateTo({ kind: 'admin', section: 'audit' })}
          onOpenProjectWorkspace={(projectId) =>
            navigateTo({ kind: 'project', projectId, section: 'overview' })
          }
        />
      )}

      {/* Context 3: Active Project Workspace */}
      {activeRoute.kind === 'project' && (
        <ProjectWorkspaceView
          projectId={activeRoute.projectId}
          section={activeRoute.section}
          currentUser={session.user}
          language={language}
          isPinned={preferences.pinnedProjectIds.includes(activeRoute.projectId)}
          onTogglePin={handleTogglePin}
          onNavigateSection={(sec) =>
            navigateTo({ kind: 'project', projectId: activeRoute.projectId, section: sec })
          }
          onNavigateOrgHome={() => navigateTo({ kind: 'org', section: 'workspace' })}
          onNavigateProjectsDirectory={() => navigateTo({ kind: 'org', section: 'projects' })}
          onNavigateAudit={() => navigateTo({ kind: 'admin', section: 'audit' })}
          onOpenSwitcher={() => setSwitcherOpen(true)}
          onProjectVerified={handleProjectVerified}
          onProjectVerificationFailed={handleProjectVerificationFailed}
          onDirtyChange={setHasUnsavedChanges}
        />
      )}

      {/* Context 4: Technical Administration */}
      {activeRoute.kind === 'admin' && activeRoute.section === 'users' && (
        <UsersManagementView language={language} />
      )}
      {activeRoute.kind === 'admin' && activeRoute.section === 'audit' && (
        <AuditLogView language={language} />
      )}
      {activeRoute.kind === 'admin' && activeRoute.section === 'diagnostics' && (
        <SystemDiagnosticsView language={language} health={health} />
      )}

      {/* Context 2: Explicit Project Switcher Modal */}
      <ProjectSwitcherModal
        open={switcherOpen}
        language={language}
        currentProjectId={activeRoute.kind === 'project' ? activeRoute.projectId : null}
        authorizedProjects={projects}
        preferences={preferences}
        onSelectProject={(project) =>
          navigateTo({ kind: 'project', projectId: project.id, section: 'overview' })
        }
        onBrowseDirectory={() => navigateTo({ kind: 'org', section: 'projects' })}
        onClose={() => setSwitcherOpen(false)}
      />

      {/* Dirty-Form Navigation Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(pendingRoute)}
        title={isArabic ? 'تغييرات غير محفوظة' : 'Modifications non enregistrées'}
        message={
          isArabic
            ? 'لديك تعديلات غير محفوظة في هذا النموذج. هل تريد تجاهلها والانتقال إلى الشاشة المطلوبة؟'
            : 'Vous avez des modifications non enregistrées dans ce formulaire. Voulez-vous les abandonner et changer d’écran ?'
        }
        confirmLabel={isArabic ? 'تجاهل والانتقال' : 'Abandonner et continuer'}
        cancelLabel={isArabic ? 'البقاء في الشاشة' : 'Rester sur cet écran'}
        onConfirm={() => {
          if (pendingRoute) {
            navigateTo(pendingRoute, { bypassDirtyGuard: true });
          }
        }}
        onCancel={() => setPendingRoute(null)}
      />
    </ErpShellLayout>
  );
}

export default App;
