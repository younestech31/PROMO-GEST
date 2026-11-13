import { useCallback, useEffect, useState } from 'react';
import type {
  AppLanguage,
  HealthStatusResponse,
  ProjectDto,
  SessionResponse,
  SetupStatusResponse,
} from '../types/erp';
import { apiClient, ApiConnectionError } from '../services/apiClient';
import { type ServerConnectionState } from '../components/ConnectionIndicator';
import { FirstRunSetupWizard } from '../features/setup/FirstRunSetupWizard';
import { LoginScreen } from '../features/auth/LoginScreen';
import { ErpShellLayout, type ErpRoute } from '../layouts/ErpShellLayout';
import { OverviewView } from '../features/overview/OverviewView';
import { UsersManagementView } from '../features/users/UsersManagementView';
import { ProjectsAccessView } from '../features/projects/ProjectsAccessView';
import { AuditLogView } from '../features/audit/AuditLogView';
import { OrganizationProfileView } from '../features/organization/OrganizationProfileView';
import { getTranslations } from '../localization/translations';

export function App() {
  const [language, setLanguage] = useState<AppLanguage>('ar');
  const [booting, setBooting] = useState(true);
  const [connectionState, setConnectionState] = useState<ServerConnectionState>('checking');
  const [health, setHealth] = useState<HealthStatusResponse | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatusResponse | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [activeRoute, setActiveRoute] = useState<ErpRoute>('overview');

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const checkHealthAndBootstrap = useCallback(async () => {
    setConnectionState('checking');
    try {
      const [healthRes, setupRes] = await Promise.all([
        apiClient.healthReady(),
        apiClient.getSetupStatus(),
      ]);
      setHealth(healthRes);
      setSetupStatus(setupRes);
      setConnectionState(healthRes.databaseConnected ? 'connected' : 'disconnected');

      if (setupRes.defaultLanguage === 'fr' || setupRes.defaultLanguage === 'ar') {
        setLanguage(setupRes.defaultLanguage);
      }

      if (setupRes.isInitialized) {
        try {
          const activeSession = await apiClient.getSession();
          setSession(activeSession);
          setLanguage(activeSession.user.preferredLanguage);
          const accessibleProjects = await apiClient.listProjects();
          setProjects(accessibleProjects);
        } catch {
          setSession(null);
        }
      } else {
        setSession(null);
      }
    } catch (err) {
      if (err instanceof ApiConnectionError) {
        setConnectionState('disconnected');
      } else {
        setConnectionState('disconnected');
      }
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void checkHealthAndBootstrap();
  }, [checkHealthAndBootstrap]);

  // Periodic background health probe (every 30s) when authenticated
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const h = await apiClient.healthReady();
        setHealth(h);
        setConnectionState(h.databaseConnected ? 'connected' : 'disconnected');
      } catch {
        setConnectionState('disconnected');
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  const handleInitialized = async () => {
    await checkHealthAndBootstrap();
  };

  const handleLoggedIn = async (newSession: SessionResponse) => {
    setSession(newSession);
    setLanguage(newSession.user.preferredLanguage);
    setActiveRoute('overview');
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
      initializedAtUtc: new Date().toISOString(),
    });
    await handleLoggedIn(previewSession);
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
    } finally {
      setSession(null);
      setProjects([]);
      setActiveRoute('overview');
    }
  };

  if (booting) {
    const t = getTranslations(language);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900">{t.appTitle}</div>
          <p className="text-xs text-slate-500 mt-1">{t.serverChecking}</p>
        </div>
      </div>
    );
  }

  if (setupStatus && !setupStatus.isInitialized) {
    return (
      <FirstRunSetupWizard
        language={language}
        onLanguageChange={setLanguage}
        onInitialized={() => void handleInitialized()}
        isPreviewMode={health?.environmentMode === 'ViteDevContractPreview'}
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
        connectionState={connectionState}
        onRetryConnection={() => void checkHealthAndBootstrap()}
        onLoggedIn={(s) => void handleLoggedIn(s)}
        isPreviewMode={health?.environmentMode === 'ViteDevContractPreview'}
        onPreviewLogin={handleOpenPreview}
      />
    );
  }

  return (
    <ErpShellLayout
      session={session}
      language={language}
      activeRoute={activeRoute}
      connectionState={connectionState}
      onNavigate={setActiveRoute}
      onLanguageChange={setLanguage}
      onRetryConnection={() => void checkHealthAndBootstrap()}
      onLogout={() => void handleLogout()}
    >
      {activeRoute === 'overview' && (
        <OverviewView
          session={session}
          language={language}
          health={health}
          projects={projects}
          onNavigate={setActiveRoute}
        />
      )}
      {activeRoute === 'projects' && (
        <ProjectsAccessView
          currentUser={session.user}
          language={language}
          onProjectsChanged={setProjects}
        />
      )}
      {activeRoute === 'users' && <UsersManagementView language={language} />}
      {activeRoute === 'audit' && <AuditLogView language={language} />}
      {activeRoute === 'organization' && (
        <OrganizationProfileView organization={session.organization} language={language} />
      )}
    </ErpShellLayout>
  );
}

export default App;
