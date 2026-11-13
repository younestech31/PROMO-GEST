import { useState, type ReactNode } from 'react';
import {
  Building2,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  ServerOff,
  Settings2,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react';
import type { AppLanguage, SessionResponse } from '../types/erp';
import { getTranslations } from '../localization/translations';
import { canManageUsers, canViewAuditLogs } from '../utils/permissions';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ConnectionIndicator, type ServerConnectionState } from '../components/ConnectionIndicator';

export type ErpRoute = 'overview' | 'projects' | 'users' | 'audit' | 'organization';

interface ErpShellLayoutProps {
  session: SessionResponse;
  language: AppLanguage;
  activeRoute: ErpRoute;
  connectionState: ServerConnectionState;
  onNavigate: (route: ErpRoute) => void;
  onLanguageChange: (lang: AppLanguage) => void;
  onRetryConnection: () => void;
  onLogout: () => void;
  children: ReactNode;
}

export function ErpShellLayout({
  session,
  language,
  activeRoute,
  connectionState,
  onNavigate,
  onLanguageChange,
  onRetryConnection,
  onLogout,
  children,
}: ErpShellLayoutProps) {
  const t = getTranslations(language);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showUsers = canManageUsers(session.user);
  const showAudit = canViewAuditLogs(session.user);

  const navButtonClass = (route: ErpRoute) => {
    const active = activeRoute === route;
    return `w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-start focus-visible:outline-2 focus-visible:outline-teal-400 ${
      active
        ? 'bg-teal-800 text-white'
        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
    }`;
  };

  const handleSelectRoute = (route: ErpRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
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
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-6 overflow-y-auto" aria-label="Main navigation">
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-slate-400">
            {t.nav.sectionOperations}
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleSelectRoute('overview')}
              className={navButtonClass('overview')}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t.nav.overview}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectRoute('projects')}
              className={navButtonClass('projects')}
            >
              <FolderKanban className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t.nav.projects}</span>
            </button>
          </div>
        </div>

        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-slate-400">
            {t.nav.sectionAdministration}
          </p>
          <div className="space-y-1">
            {showUsers && (
              <button
                type="button"
                onClick={() => handleSelectRoute('users')}
                className={navButtonClass('users')}
              >
                <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t.nav.users}</span>
              </button>
            )}
            {showAudit && (
              <button
                type="button"
                onClick={() => handleSelectRoute('audit')}
                className={navButtonClass('audit')}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t.nav.audit}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSelectRoute('organization')}
              className={navButtonClass('organization')}
            >
              <Settings2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t.nav.organization}</span>
            </button>
          </div>
        </div>
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
          <div className="flex items-center justify-between gap-4">
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
                  {session.organization.legalForm} · {session.organization.wilayaCode} {session.organization.wilayaName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="hidden sm:block">
                <ConnectionIndicator
                  state={connectionState}
                  language={language}
                  onRetry={onRetryConnection}
                />
              </div>
              <LanguageSwitcher language={language} onChange={onLanguageChange} />
            </div>
          </div>
        </header>

        {connectionState === 'disconnected' && (
          <div
            role="alert"
            className="bg-red-50 border-b border-red-200 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="flex items-start gap-2.5 text-red-900">
              <ServerOff className="w-4 h-4 mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold">{t.serverDisconnectedBannerTitle}</p>
                <p className="text-xs text-red-800 mt-0.5">{t.serverDisconnectedBannerBody}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRetryConnection}
              className="px-3 py-1.5 text-xs font-semibold rounded border border-red-300 bg-white text-red-800 hover:bg-red-100 whitespace-nowrap shrink-0"
            >
              {t.retryConnection}
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
