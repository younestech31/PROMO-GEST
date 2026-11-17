import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { AppLanguage, HealthStatusResponse, ProjectDto, SessionResponse } from '../types/erp';
import { ApiError, apiClient } from '../core/api/apiClient';
import { getTranslations } from '../core/localization/translations';
import {
  DEFAULT_APP_ROUTE,
  buildAppPath,
  canAccessRoute,
  getDeniedRouteNotice,
  isSameRoute,
  parseAppLocation,
  shouldBlockNavigation,
  shouldIgnoreGlobalShortcut,
  revokeProjectAccessFromState,
  type AppRouteState,
} from './routeRegistry';
import {
  loadProjectNavigationPreferences,
  saveProjectNavigationPreferences,
} from '../shared/utils/navigationPreferences';
import { useUnsavedGuard } from '../shared/hooks/useUnsavedGuard';
import { ErpShellLayout } from './ErpShellLayout';
import { LoginScreen, authApi } from '../modules/auth';
import { FirstRunSetupWizard, setupApi } from '../modules/setup';
import {
  OverviewView,
  OrganizationProfileView,
  TerritorialReferenceView,
  EmployeesPlannedView,
  canManageOrganizationProfile,
} from '../modules/module-a-organization';
import {
  ProjectsAccessView,
  ProjectWorkspaceView,
  ProjectSwitcherModal,
} from '../modules/module-b-projects';
import { PartiesDirectoryView } from '../modules/module-d-customers-parties';
import {
  UsersManagementView,
  AuditLogView,
  SystemDiagnosticsView,
} from '../modules/technical-admin';
import { ReportsWorkspaceView } from '../modules/module-l-reporting';
import { ConfirmDialog, ErrorBanner } from '../shared/components/StateViews';

type PendingNavigation =
  | { kind: 'route'; route: AppRouteState; fromHistory?: boolean }
  | { kind: 'logout' };

interface AppContentRouterProps {
  session: SessionResponse;
  language: AppLanguage;
  health: HealthStatusResponse | null;
  projects: ProjectDto[];
  activeRoute: AppRouteState;
  onNavigate: (route: AppRouteState) => void;
  onOpenSwitcher: () => void;
  onProjectVerified: (project: ProjectDto) => void;
  onProjectVerificationFailed: (projectId: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  saveActionRef: MutableRefObject<(() => Promise<boolean>) | null>;
  discardActionRef: MutableRefObject<(() => void) | null>;
}

export function AppContentRouter({
  session,
  language,
  health,
  projects,
  activeRoute,
  onNavigate,
  onOpenSwitcher,
  onProjectVerified,
  onProjectVerificationFailed,
  onDirtyChange,
  saveActionRef,
  discardActionRef,
}: AppContentRouterProps) {
  const routeAllowed = canAccessRoute(session.user, activeRoute);

  useEffect(() => {
    if (!routeAllowed) {
      onNavigate(DEFAULT_APP_ROUTE);
    }
  }, [routeAllowed, onNavigate]);

  // Do not mount protected route content even for the render preceding the redirect effect.
  if (!routeAllowed) {
    return (
      <ErrorBanner
        message={getDeniedRouteNotice(activeRoute, language)}
      />
    );
  }

  return (
    <div className="space-y-4">
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
          currentUser={session.user}
          language={language}
          onOpenProjectWorkspace={(projectId) =>
            onNavigate({ kind: 'project', projectId, section: 'overview' })
          }
          onDirtyChange={onDirtyChange}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'organizationProfile' && (
        <OrganizationProfileView
          organization={session.organization}
          language={language}
          canManage={canManageOrganizationProfile(session.user)}
          onUpdated={(updated) => {
            session.organization = updated;
          }}
          onDirtyChange={onDirtyChange}
          saveActionRef={saveActionRef}
        />
      )}

      {activeRoute.kind === 'org' && activeRoute.section === 'parties' && (
        <PartiesDirectoryView
          currentUser={session.user}
          language={language}
          onNavigateHome={() => onNavigate({ kind: 'org', section: 'workspace' })}
          onDirtyChange={onDirtyChange}
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
        <ReportsWorkspaceView
          currentUser={session.user}
          language={language}
          projects={projects}
          onNavigateHome={() => onNavigate(DEFAULT_APP_ROUTE)}
          onNavigateAudit={() => onNavigate({ kind: 'admin', section: 'audit' })}
          onOpenProjectWorkspace={(projectId) =>
            onNavigate({ kind: 'project', projectId, section: 'overview' })
          }
        />
      )}

      {activeRoute.kind === 'project' && (
        <ProjectWorkspaceView
          projectId={activeRoute.projectId}
          section={activeRoute.section}
          currentUser={session.user}
          language={language}
          isPinned={loadProjectNavigationPreferences(session.user.id).pinnedProjectIds.includes(
            activeRoute.projectId
          )}
          onTogglePin={(projectId) => {
            const preferences = loadProjectNavigationPreferences(session.user.id);
            const isPinned = preferences.pinnedProjectIds.includes(projectId);
            saveProjectNavigationPreferences(session.user.id, {
              ...preferences,
              pinnedProjectIds: isPinned
                ? preferences.pinnedProjectIds.filter((id) => id !== projectId)
                : [projectId, ...preferences.pinnedProjectIds],
            });
          }}
          onNavigateSection={(section) =>
            onNavigate({ kind: 'project', projectId: activeRoute.projectId, section })
          }
          onNavigateOrgHome={() => onNavigate(DEFAULT_APP_ROUTE)}
          onNavigateProjectsDirectory={() => onNavigate({ kind: 'org', section: 'projects' })}
          onNavigateAudit={() => onNavigate({ kind: 'admin', section: 'audit' })}
          onProjectVerified={onProjectVerified}
          onProjectVerificationFailed={onProjectVerificationFailed}
          onDirtyChange={onDirtyChange}
          saveActionRef={saveActionRef}
          discardActionRef={discardActionRef}
        />
      )}

      {activeRoute.kind === 'admin' && activeRoute.section === 'users' && (
        <UsersManagementView language={language} onDirtyChange={onDirtyChange} />
      )}

      {activeRoute.kind === 'admin' && activeRoute.section === 'audit' && (
        <AuditLogView language={language} />
      )}

      {activeRoute.kind === 'admin' && activeRoute.section === 'diagnostics' && (
        <SystemDiagnosticsView language={language} health={health} />
      )}
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [health, setHealth] = useState<HealthStatusResponse | null>(null);
  const requestInFlight = useRef(false);
  const [setupState, setSetupState] = useState<{
    isInitialized: boolean;
    requiresBootstrapToken?: boolean;
    organizationLegalName?: string | null;
  } | null>(null);
  const [unauthenticatedLanguage, setUnauthenticatedLanguage] = useState<AppLanguage>('ar');
  const [setupCompletedNotice, setSetupCompletedNotice] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [activeRoute, setActiveRoute] = useState<AppRouteState>(() =>
    parseAppLocation(typeof window !== 'undefined' ? window.location.pathname : '/')
  );
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const [navigationGuardOpen, setNavigationGuardOpen] = useState(false);
  const [savingNavigation, setSavingNavigation] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);

  const activeRouteRef = useRef(activeRoute);
  const dirtyRef = useRef(false);
  const saveActionRef = useRef<(() => Promise<boolean>) | null>(null);
  const discardActionRef = useRef<(() => void) | null>(null);
  const logoutInFlightRef = useRef(false);

  useUnsavedGuard(hasUnsavedChanges);

  // Keep technical diagnostics current without creating a global disconnected state.
  // Requests pause while the tab is hidden and never overlap.
  useEffect(() => {
    let mounted = true;

    const pollHealth = async () => {
      if (document.visibilityState !== 'visible' || requestInFlight.current) return;

      requestInFlight.current = true;
      try {
        const result = await apiClient.healthReady();
        if (mounted) setHealth(result);
      } catch {
        if (mounted) setHealth(null);
      } finally {
        requestInFlight.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void pollHealth();
    };

    void pollHealth();
    const intervalId = window.setInterval(() => void pollHealth(), 60_000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    activeRouteRef.current = activeRoute;
  }, [activeRoute]);

  const commitRoute = useCallback((route: AppRouteState) => {
    activeRouteRef.current = route;
    setActiveRoute(route);
  }, []);

  const requestNavigation = useCallback((route: AppRouteState) => {
    const current = activeRouteRef.current;
    if (isSameRoute(current, route)) return;

    if (shouldBlockNavigation(dirtyRef.current, current, route)) {
      setPendingNavigation({ kind: 'route', route });
      setNavigationGuardOpen(true);
      return;
    }

    commitRoute(route);
  }, [commitRoute]);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
    setHasUnsavedChanges(dirty);
  }, []);

  const clearLocalSession = useCallback(() => {
    dirtyRef.current = false;
    setHasUnsavedChanges(false);
    setPendingNavigation(null);
    setNavigationGuardOpen(false);
    setLogoutFailed(false);
    setSession(null);
    setProjects([]);
    commitRoute(DEFAULT_APP_ROUTE);
  }, [commitRoute]);

  const performLogout = useCallback(async () => {
    if (logoutInFlightRef.current) return;
    logoutInFlightRef.current = true;
    setLogoutFailed(false);

    try {
      await authApi.logout();
      clearLocalSession();
    } catch {
      // A failed response may be ambiguous (for example, the server committed the
      // revocation but the response was lost). Verify the cookie against the server.
      try {
        await authApi.getSession();
        // The session is still valid, so do not present a local-only logout.
        setLogoutFailed(true);
      } catch (verificationError) {
        if (verificationError instanceof ApiError && verificationError.status === 401) {
          clearLocalSession();
        } else {
          // The server could not confirm revocation. Keep the authenticated UI visible.
          setLogoutFailed(true);
        }
      }
    } finally {
      logoutInFlightRef.current = false;
    }
  }, [clearLocalSession]);

  const requestLogout = useCallback(() => {
    if (dirtyRef.current) {
      setPendingNavigation({ kind: 'logout' });
      setNavigationGuardOpen(true);
      return;
    }
    void performLogout();
  }, [performLogout]);

  const handleProjectVerified = useCallback((project: ProjectDto) => {
    setProjects((current) => {
      const existingIndex = current.findIndex((item) => item.id === project.id);
      if (existingIndex < 0) return [...current, project];
      return current.map((item) => item.id === project.id ? project : item);
    });
  }, []);

  const handleProjectVerificationFailed = useCallback((projectId: string) => {
    const userId = session?.user.id;
    if (userId) {
      const currentPreferences = loadProjectNavigationPreferences(userId);
      const cleaned = revokeProjectAccessFromState([], currentPreferences, projectId);
      saveProjectNavigationPreferences(userId, cleaned.preferences);
    }
    setProjects((current) => current.filter((project) => project.id !== projectId));

    if (
      activeRouteRef.current.kind === 'project' &&
      activeRouteRef.current.projectId === projectId
    ) {
      discardActionRef.current?.();
      dirtyRef.current = false;
      setHasUnsavedChanges(false);
      setPendingNavigation(null);
      setNavigationGuardOpen(false);
      commitRoute(DEFAULT_APP_ROUTE);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', buildAppPath(DEFAULT_APP_ROUTE));
      }
    }
  }, [commitRoute, session?.user.id]);

  const handleSaveAndContinue = useCallback(async () => {
    const pending = pendingNavigation;
    const save = saveActionRef.current;
    if (!pending || !save || savingNavigation) return;

    setSavingNavigation(true);
    try {
      const saved = await save();
      if (!saved) return;

      dirtyRef.current = false;
      setHasUnsavedChanges(false);
      setNavigationGuardOpen(false);
      setPendingNavigation(null);

      if (pending.kind === 'route') {
        if (pending.fromHistory) {
          // The original popstate target is still one entry behind the restored URL.
          // Move back to it now that the draft was saved and the guard is cleared.
          window.history.back();
        } else {
          commitRoute(pending.route);
        }
      } else {
        await performLogout();
      }
    } finally {
      setSavingNavigation(false);
    }
  }, [commitRoute, pendingNavigation, performLogout, savingNavigation]);

  const handleDiscardAndContinue = useCallback(() => {
    const pending = pendingNavigation;
    if (!pending || savingNavigation) return;

    discardActionRef.current?.();
    dirtyRef.current = false;
    setHasUnsavedChanges(false);
    setNavigationGuardOpen(false);
    setPendingNavigation(null);

    if (pending.kind === 'route') {
      if (pending.fromHistory) {
        window.history.back();
      } else {
        commitRoute(pending.route);
      }
    } else {
      void performLogout();
    }
  }, [commitRoute, pendingNavigation, performLogout, savingNavigation]);

  const handleStay = useCallback(() => {
    if (savingNavigation) return;
    setNavigationGuardOpen(false);
    setPendingNavigation(null);
  }, [savingNavigation]);

  useEffect(() => {
    let active = true;

    const checkState = async () => {
      try {
        const setup = await setupApi.getSetupStatus();
        if (!active) return;
        setSetupState(setup);
        if (setup.defaultLanguage) setUnauthenticatedLanguage(setup.defaultLanguage);

        if (setup.isInitialized) {
          try {
            const currentSession = await authApi.getSession();
            if (!active) return;
            setSession(currentSession);
            try {
              const authorizedProjects = await apiClient.listProjects();
              if (active) setProjects(authorizedProjects);
            } catch {
              // Session can still be used when the project directory is temporarily unavailable.
            }
          } catch {
            if (active) setSession(null);
          }
        }
      } catch {
        // The first-run and login surfaces provide their own local connection errors.
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
      const requestedRoute = parseAppLocation(window.location.pathname);
      const currentRoute = activeRouteRef.current;

      if (shouldBlockNavigation(dirtyRef.current, currentRoute, requestedRoute)) {
        // popstate has already moved the browser history cursor; restore the current URL
        // while the user decides whether to save, discard, or stay.
        window.history.pushState(null, '', buildAppPath(currentRoute));
        setPendingNavigation({ kind: 'route', route: requestedRoute, fromHistory: true });
        setNavigationGuardOpen(true);
        return;
      }

      activeRouteRef.current = requestedRoute;
      setActiveRoute(requestedRoute);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const expectedPath = buildAppPath(activeRoute);
    if (window.location.pathname !== expectedPath) {
      window.history.pushState(null, '', expectedPath);
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

  const language = session?.user.preferredLanguage ?? unauthenticatedLanguage;

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    if (!session) {
      setUnauthenticatedLanguage(nextLanguage);
      return;
    }
    setSession({
      ...session,
      user: { ...session.user, preferredLanguage: nextLanguage },
    });
  };

  const handlePreviewLogin = async () => {
    const demoSession = await authApi.openPreviewSession();
    setSession({
      ...demoSession,
      user: { ...demoSession.user, preferredLanguage: unauthenticatedLanguage },
    });
    setSetupCompletedNotice(false);
    const authorizedProjects = await apiClient.listProjects();
    setProjects(authorizedProjects);
    commitRoute(DEFAULT_APP_ROUTE);
  };

  const handleInitialized = async (defaultLanguage: AppLanguage, organizationLegalName: string) => {
    // Setup creates the administrator account but deliberately does not issue an authenticated session.
    // Move to the normal login screen instead of calling /auth/me without a session cookie.
    setSession(null);
    setProjects([]);
    setSetupState({ isInitialized: true, organizationLegalName });
    setUnauthenticatedLanguage(defaultLanguage);
    setSetupCompletedNotice(true);
    commitRoute(DEFAULT_APP_ROUTE);
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
        onInitialized={handleInitialized}
      />
    );
  }

  if (!session) {
    return (
      <LoginScreen
        language={language}
        onLanguageChange={handleLanguageChange}
        organizationName={setupState.organizationLegalName ?? null}
        setupCompleted={setupCompletedNotice}
        isPreviewMode={true}
        onPreviewLogin={handlePreviewLogin}
        onLoggedIn={(newSession) => {
          setSession({
            ...newSession,
            user: { ...newSession.user, preferredLanguage: unauthenticatedLanguage },
          });
          setSetupCompletedNotice(false);
          void apiClient.listProjects().then(setProjects);
        }}
      />
    );
  }

  const isArabic = language === 'ar';
  const canSavePendingNavigation = Boolean(saveActionRef.current);

  return (
    <ErpShellLayout
      session={session}
      language={language}
      activeRoute={activeRoute}
      activeProject={
        activeRoute.kind === 'project'
          ? projects.find((project) => project.id === activeRoute.projectId) ?? null
          : null
      }
      onNavigate={requestNavigation}
      onOpenSwitcher={() => setSwitcherOpen(true)}
      onLanguageChange={handleLanguageChange}
      onLogout={requestLogout}
    >
      {logoutFailed && (
        <ErrorBanner
          message={getTranslations(language).auth.logoutFailed}
          actionLabel={getTranslations(language).auth.retryLogout}
          onAction={() => void performLogout()}
        />
      )}

      <AppContentRouter
        session={session}
        language={language}
        health={health}
        projects={projects}
        activeRoute={activeRoute}
        onNavigate={requestNavigation}
        onOpenSwitcher={() => setSwitcherOpen(true)}
        onProjectVerified={handleProjectVerified}
        onProjectVerificationFailed={handleProjectVerificationFailed}
        onDirtyChange={handleDirtyChange}
        saveActionRef={saveActionRef}
        discardActionRef={discardActionRef}
      />

      <ProjectSwitcherModal
        open={switcherOpen}
        language={language}
        currentProjectId={activeRoute.kind === 'project' ? activeRoute.projectId : null}
        authorizedProjects={projects}
        preferences={loadProjectNavigationPreferences(session.user.id)}
        onSelectProject={(project) => {
          setSwitcherOpen(false);
          requestNavigation({ kind: 'project', projectId: project.id, section: 'overview' });
        }}
        onBrowseDirectory={() => {
          setSwitcherOpen(false);
          requestNavigation({ kind: 'org', section: 'projects' });
        }}
        onClose={() => setSwitcherOpen(false)}
      />

      <ConfirmDialog
        open={navigationGuardOpen}
        title={isArabic ? 'توجد تغييرات غير محفوظة' : 'Modifications non enregistrées'}
        message={
          isArabic
            ? 'توجد تغييرات لم تُحفظ. احفظها قبل المتابعة، أو تخلّص منها صراحةً، أو ابقَ في الصفحة الحالية.'
            : 'Des modifications ne sont pas enregistrées. Enregistrez-les avant de continuer, abandonnez-les explicitement ou restez sur la page actuelle.'
        }
        confirmLabel={isArabic ? 'تجاهل التغييرات والمتابعة' : 'Abandonner et continuer'}
        cancelLabel={isArabic ? 'البقاء هنا' : 'Rester ici'}
        saveConfirmLabel={
          canSavePendingNavigation
            ? (isArabic ? 'حفظ والمتابعة' : 'Enregistrer et continuer')
            : undefined
        }
        savingConfirm={savingNavigation}
        onSaveAndConfirm={() => void handleSaveAndContinue()}
        onConfirm={handleDiscardAndContinue}
        onCancel={handleStay}
      />
    </ErpShellLayout>
  );
}

export default App;
