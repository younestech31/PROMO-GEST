import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
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
  recordRecentProjectId,
  saveProjectNavigationPreferences,
  togglePinnedProjectId,
} from '../shared/utils/navigationPreferences';
import { useUnsavedGuard } from '../shared/hooks/useUnsavedGuard';
import { readAppHistoryIndex, withAppHistoryIndex } from './browserHistory';
import { getDocumentPresentation, isViteDevelopmentBuild, isVitePreviewRuntime } from '../shared/utils/appRuntime';
import { ErpShellLayout } from './ErpShellLayout';
import { ChangePasswordModal, ChangePasswordRequiredScreen, LoginScreen, SessionsSecurityModal, authApi } from '../modules/auth';
import { canManageOrganizationProfile } from '../core/permissions/permissionPolicy';
import { ConfirmDialog, ErrorBanner } from '../shared/components/StateViews';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';

// Route-level code splitting: the authenticated workspace modules are only downloaded when the
// operator actually opens them, so the login screen and the shell stay small on LAN hardware.
// Each module barrel is imported at most once; components of the same module share its chunk.
const OverviewView = lazy(() =>
  import('../modules/module-a-organization').then((module) => ({ default: module.OverviewView }))
);
const OrganizationProfileView = lazy(() =>
  import('../modules/module-a-organization').then((module) => ({ default: module.OrganizationProfileView }))
);
const TerritorialReferenceView = lazy(() =>
  import('../modules/module-a-organization').then((module) => ({ default: module.TerritorialReferenceView }))
);
const EmployeesPlannedView = lazy(() =>
  import('../modules/module-a-organization').then((module) => ({ default: module.EmployeesPlannedView }))
);
const ProjectsAccessView = lazy(() =>
  import('../modules/module-b-projects').then((module) => ({ default: module.ProjectsAccessView }))
);
const ProjectWorkspaceView = lazy(() =>
  import('../modules/module-b-projects').then((module) => ({ default: module.ProjectWorkspaceView }))
);
const ProjectSwitcherModal = lazy(() =>
  import('../modules/module-b-projects').then((module) => ({ default: module.ProjectSwitcherModal }))
);
const PartiesDirectoryView = lazy(() =>
  import('../modules/module-d-customers-parties').then((module) => ({ default: module.PartiesDirectoryView }))
);
const UsersManagementView = lazy(() =>
  import('../modules/technical-admin').then((module) => ({ default: module.UsersManagementView }))
);
const AuditLogView = lazy(() =>
  import('../modules/technical-admin').then((module) => ({ default: module.AuditLogView }))
);
const SystemDiagnosticsView = lazy(() =>
  import('../modules/technical-admin').then((module) => ({ default: module.SystemDiagnosticsView }))
);
const ReportsWorkspaceView = lazy(() =>
  import('../modules/module-l-reporting').then((module) => ({ default: module.ReportsWorkspaceView }))
);
const FirstRunSetupWizard = lazy(() =>
  import('../modules/setup').then((module) => ({ default: module.FirstRunSetupWizard }))
);

function WorkspaceFallback({ language }: { language: AppLanguage }) {
  return (
    <div role="status" aria-live="polite" className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-sm text-slate-600">
      {getTranslations(language).loadingWorkspace}
    </div>
  );
}

type PendingNavigation =
  | {
      kind: 'route';
      route: AppRouteState;
      fromHistory?: boolean;
      historyTargetIndex?: number;
      historyCurrentIndex?: number;
    }
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
  onOrganizationUpdated: (organization: SessionResponse['organization']) => void;
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
  onOrganizationUpdated,
  saveActionRef,
  discardActionRef,
}: AppContentRouterProps) {
  const [, refreshNavigationPreferences] = useState(0);
  const routeAllowed = canAccessRoute(session.user, activeRoute);

  // The refusal stays on screen until the operator acknowledges it. Redirecting in an
  // effect rendered the localized notice for a single frame, which read as a silent
  // bounce back to the workspace (round-2 defect D2, check W2-8).
  if (!routeAllowed) {
    return (
      <ErrorBanner
        message={getDeniedRouteNotice(activeRoute, language)}
        actionLabel={getTranslations(language).nav.overview}
        onAction={() => onNavigate(DEFAULT_APP_ROUTE)}
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
          onUpdated={onOrganizationUpdated}
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
            saveProjectNavigationPreferences(
              session.user.id,
              togglePinnedProjectId(preferences, projectId)
            );
            refreshNavigationPreferences((revision) => revision + 1);
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
        <AuditLogView language={language} currentUser={session.user} />
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
  const [setupState, setSetupState] = useState<{
    isInitialized: boolean;
    requiresBootstrapToken?: boolean;
    organizationLegalName?: string | null;
  } | null>(null);
  const [unauthenticatedLanguage, setUnauthenticatedLanguage] = useState<AppLanguage>('ar');
  const [setupCompletedNotice, setSetupCompletedNotice] = useState(false);
  const [passwordChangedNotice, setPasswordChangedNotice] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
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
  const [languageSaving, setLanguageSaving] = useState(false);
  const [languageSaveFailed, setLanguageSaveFailed] = useState(false);

  const activeRouteRef = useRef(activeRoute);
  const historyIndexRef = useRef(0);
  const pendingHistoryRestoreRef = useRef<Extract<PendingNavigation, { kind: 'route' }> | null>(null);
  const dirtyRef = useRef(false);
  const saveActionRef = useRef<(() => Promise<boolean>) | null>(null);
  const discardActionRef = useRef<(() => void) | null>(null);
  const logoutInFlightRef = useRef(false);
  const languageUpdateInFlightRef = useRef(false);

  useUnsavedGuard(hasUnsavedChanges);

  // Keep technical diagnostics current without creating a global disconnected state.
  // Requests pause while the tab is hidden and never overlap.
  useEffect(() => {
    let mounted = true;
    // Effect-local on purpose: a StrictMode mount that is discarded mid-flight must not leave a
    // stale in-flight flag behind, because the replacement mount would then skip its first poll
    // and the preview-access button would stay hidden until a visibilitychange or the 60 s tick.
    let requestInFlight = false;

    const pollHealth = async () => {
      if (document.visibilityState !== 'visible' || requestInFlight) return;

      requestInFlight = true;
      try {
        const result = await apiClient.healthReady();
        if (mounted) setHealth(result);
      } catch {
        if (mounted) setHealth(null);
      } finally {
        requestInFlight = false;
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
    const userId = session?.user.id;
    if (userId) {
      const preferences = loadProjectNavigationPreferences(userId);
      saveProjectNavigationPreferences(userId, recordRecentProjectId(preferences, project.id));
    }

    setProjects((current) => {
      const existingIndex = current.findIndex((item) => item.id === project.id);
      if (existingIndex < 0) return [...current, project];
      return current.map((item) => item.id === project.id ? project : item);
    });
  }, [session?.user.id]);

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
        window.history.replaceState(window.history.state, '', buildAppPath(DEFAULT_APP_ROUTE));
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
        if (
          pending.fromHistory &&
          pending.historyTargetIndex !== undefined &&
          pending.historyCurrentIndex !== undefined
        ) {
          window.history.go(pending.historyTargetIndex - pending.historyCurrentIndex);
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
      if (
        pending.fromHistory &&
        pending.historyTargetIndex !== undefined &&
        pending.historyCurrentIndex !== undefined
      ) {
        window.history.go(pending.historyTargetIndex - pending.historyCurrentIndex);
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
        // Restore an existing session before requesting public setup metadata. A temporary
        // password session is deliberately restricted to /auth/me, password change and logout;
        // calling /api/setup/status first would be rejected by PasswordChangeRequiredMiddleware.
        try {
          const currentSession = await authApi.getSession();
          if (!active) return;

          setSession(currentSession);
          setSetupState({
            isInitialized: true,
            organizationLegalName: currentSession.organization.legalName,
          });

          if (currentSession.user.mustChangePasswordAtNextLogin) {
            setProjects([]);
          } else {
            try {
              const authorizedProjects = await apiClient.listProjects();
              if (active) setProjects(authorizedProjects);
            } catch {
              // Session can still be used when the project directory is temporarily unavailable.
            }
          }
          return;
        } catch {
          if (active) setSession(null);
        }

        // Only unauthenticated clients need first-run status and the public default language.
        const setup = await apiClient.getSetupStatus();
        if (!active) return;
        setSetupState(setup);
        if (setup.defaultLanguage) setUnauthenticatedLanguage(setup.defaultLanguage);
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
    const existingIndex = readAppHistoryIndex(window.history.state);
    const initialIndex = existingIndex ?? 0;
    historyIndexRef.current = initialIndex;
    if (existingIndex === null) {
      window.history.replaceState(
        withAppHistoryIndex(window.history.state, initialIndex),
        '',
        window.location.href
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      const requestedRoute = parseAppLocation(window.location.pathname);
      const currentRoute = activeRouteRef.current;
      const currentHistoryIndex = historyIndexRef.current;
      const eventHistoryIndex = readAppHistoryIndex(event.state);

      // A blocked Back/Forward first restores the cursor to the current entry with
      // history.go(). Only after that restoration event do we expose the decision dialog.
      if (pendingHistoryRestoreRef.current) {
        const pending = pendingHistoryRestoreRef.current;
        historyIndexRef.current = eventHistoryIndex ?? pending.historyCurrentIndex ?? currentHistoryIndex;
        pendingHistoryRestoreRef.current = null;
        setPendingNavigation(pending);
        setNavigationGuardOpen(true);
        return;
      }

      const targetHistoryIndex = eventHistoryIndex ?? currentHistoryIndex - 1;
      if (shouldBlockNavigation(dirtyRef.current, currentRoute, requestedRoute)) {
        // Keep the browser's forward/back stack intact. Pushing the current URL here
        // would truncate forward entries when the user chooses Stay.
        if (targetHistoryIndex < 0) return;
        const pending: Extract<PendingNavigation, { kind: 'route' }> = {
          kind: 'route',
          route: requestedRoute,
          fromHistory: true,
          historyTargetIndex: targetHistoryIndex,
          historyCurrentIndex: currentHistoryIndex,
        };
        pendingHistoryRestoreRef.current = pending;
        window.history.go(currentHistoryIndex - targetHistoryIndex);
        return;
      }

      historyIndexRef.current = eventHistoryIndex ?? (
        targetHistoryIndex >= 0 ? targetHistoryIndex : currentHistoryIndex
      );
      commitRoute(requestedRoute);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [commitRoute]);

  useEffect(() => {
    const expectedPath = buildAppPath(activeRoute);
    if (window.location.pathname !== expectedPath) {
      const nextHistoryIndex = historyIndexRef.current + 1;
      historyIndexRef.current = nextHistoryIndex;
      window.history.pushState(
        withAppHistoryIndex(window.history.state, nextHistoryIndex),
        '',
        expectedPath
      );
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
  const isPreviewMode = isViteDevelopmentBuild && isVitePreviewRuntime(health);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const presentation = getDocumentPresentation(language);
    document.documentElement.lang = presentation.lang;
    document.documentElement.dir = presentation.dir;
    document.title = presentation.title;
  }, [language]);

  const handleLanguageChange = async (nextLanguage: AppLanguage) => {
    if (!session) {
      setUnauthenticatedLanguage(nextLanguage);
      return;
    }
    if (nextLanguage === session.user.preferredLanguage || languageUpdateInFlightRef.current) return;

    languageUpdateInFlightRef.current = true;
    setLanguageSaving(true);
    setLanguageSaveFailed(false);
    try {
      // Apply the new locale only after the API persists it using the session concurrency stamp.
      const updatedSession = await apiClient.updatePreferredLanguage(
        nextLanguage,
        session.user.concurrencyStamp
      );
      setSession(updatedSession);
    } catch (error) {
      // A 409 means another tab/session changed this account after it was loaded.
      // Refresh the authoritative session instead of retrying with a stale stamp.
      if (error instanceof ApiError && error.status === 409) {
        try {
          setSession(await apiClient.getSession());
        } catch {
          // Keep the current locale and show the same explicit save failure.
        }
      }
      setLanguageSaveFailed(true);
    } finally {
      languageUpdateInFlightRef.current = false;
      setLanguageSaving(false);
    }
  };

  const handlePreviewLogin = async () => {
    if (!isViteDevelopmentBuild || !isPreviewMode) {
      throw new Error(
        language === 'ar'
          ? 'المعاينة التجريبية متاحة فقط في وضع Vite المنفصل.'
          : 'La démonstration en mémoire est uniquement disponible en mode aperçu Vite.'
      );
    }
    const demoSession = await apiClient.openPreviewSession();
    setSession({
      ...demoSession,
      user: { ...demoSession.user, preferredLanguage: unauthenticatedLanguage },
    });
    // The first-run wizard is gated on setupState, not on the session, so the demo entry
    // must mark the installation as initialized or the wizard stays on screen after a
    // successful sign-in (round-2 defect D1, check W1-5).
    setSetupState({
      isInitialized: true,
      requiresBootstrapToken: false,
      organizationLegalName: demoSession.organization.legalName,
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
      <ErrorBoundary language={language} scope="first-run-setup">
        <Suspense fallback={<WorkspaceFallback language={language} />}>
          <FirstRunSetupWizard
            language={language}
            onLanguageChange={handleLanguageChange}
            requiresBootstrapToken={setupState?.requiresBootstrapToken}
            isPreviewMode={isPreviewMode}
            onPreviewLogin={handlePreviewLogin}
            onInitialized={handleInitialized}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (session?.user.mustChangePasswordAtNextLogin) {
    return (
      <ChangePasswordRequiredScreen
        language={language}
        fullName={session.user.fullName}
        username={session.user.username}
        logoutFailed={logoutFailed}
        onCompleted={() => {
          setUnauthenticatedLanguage(language);
          setSession(null);
          setProjects([]);
          setPasswordChangedNotice(true);
          setSetupCompletedNotice(false);
        }}
        onLogout={() => void performLogout()}
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
        passwordChangedNotice={passwordChangedNotice}
        isPreviewMode={isPreviewMode}
        onPreviewLogin={handlePreviewLogin}
        onLoggedIn={(newSession) => {
          // The authenticated session is authoritative: do not replace the persisted
          // user preference with the login screen's unauthenticated display language.
          setSession(newSession);
          setSetupCompletedNotice(false);
          setPasswordChangedNotice(false);
          if (newSession.user.mustChangePasswordAtNextLogin) {
            setProjects([]);
          } else {
            void apiClient.listProjects().then(setProjects);
          }
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
      onChangePassword={() => setChangePasswordOpen(true)}
      onOpenSessions={() => setSessionsOpen(true)}
      onLogout={requestLogout}
    >
      {languageSaving && (
        <div role="status" aria-live="polite" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
          {getTranslations(language).auth.languageSaving}
        </div>
      )}
      {languageSaveFailed && (
        <ErrorBanner message={getTranslations(language).auth.languageSaveFailed} />
      )}
      {logoutFailed && (
        <ErrorBanner
          message={getTranslations(language).auth.logoutFailed}
          actionLabel={getTranslations(language).auth.retryLogout}
          onAction={() => void performLogout()}
        />
      )}

      <ErrorBoundary language={language} scope={`route:${activeRoute.kind}`} key={JSON.stringify(activeRoute)}>
        <Suspense fallback={<WorkspaceFallback language={language} />}>
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
            onOrganizationUpdated={(organization) =>
              setSession((current) => (current ? { ...current, organization } : current))
            }
            saveActionRef={saveActionRef}
            discardActionRef={discardActionRef}
          />
        </Suspense>
      </ErrorBoundary>

      {sessionsOpen && (
        <SessionsSecurityModal
          language={language}
          onClose={() => setSessionsOpen(false)}
          hasUnsavedChanges={hasUnsavedChanges}
          onCurrentSessionRevoked={() => {
            setSessionsOpen(false);
            clearLocalSession();
            setSetupCompletedNotice(false);
          }}
        />
      )}

      {changePasswordOpen && (
        <ChangePasswordModal
          language={language}
          onClose={() => setChangePasswordOpen(false)}
          onCompleted={() => {
            setChangePasswordOpen(false);
            setSession(null);
            setProjects([]);
            setSetupCompletedNotice(false);
            setPasswordChangedNotice(true);
          }}
        />
      )}

      <Suspense fallback={null}>
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
      </Suspense>

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
