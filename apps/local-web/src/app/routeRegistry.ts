import type { AppLanguage, AuthenticatedUser, ProjectDto } from '../types/erp';
import type { ModuleCode } from '../core/modules/moduleCodes';
import type {
  AppRouteState,
  OrgWorkspaceSection,
  ProjectWorkspaceSection,
  TechnicalAdminSection,
} from '../core/modules/routeTypes';
import {
  canManageUsers,
  canReadPartyDirectory,
  canViewAuditLogs,
  canViewTechnicalAdmin,
} from '../core/permissions/permissionPolicy';
import type { ProjectNavigationPreferences } from '../shared/utils/navigationPreferences';

export type {
  AppRouteState,
  OrgWorkspaceSection,
  ProjectWorkspaceSection,
  TechnicalAdminSection,
};

export const DEFAULT_APP_ROUTE: AppRouteState = {
  kind: 'org',
  section: 'workspace',
};

export interface NavSectionMeta<TSection extends string> {
  section: TSection;
  moduleCode?: ModuleCode;
  planned?: boolean;
  label: Record<AppLanguage, string>;
}

/**
 * Single authoritative navigation & context metadata for Context A (Organization Workspace).
 */
export const ORG_ROUTE_META: readonly NavSectionMeta<OrgWorkspaceSection>[] = [
  { section: 'workspace', moduleCode: 'A', label: { ar: 'مساحة المؤسسة', fr: 'Espace Organisation' } },
  { section: 'projects', moduleCode: 'B', label: { ar: 'دليل المشاريع', fr: 'Annuaire des Projets' } },
  { section: 'parties', moduleCode: 'D', label: { ar: 'دليل الأطراف', fr: 'Répertoire Tiers' } },
  { section: 'organizationProfile', moduleCode: 'A', label: { ar: 'ملف المؤسسة', fr: 'Profil Organisation' } },
  { section: 'territorialReference', moduleCode: 'A', label: { ar: 'المرجع الإقليمي', fr: 'Référentiel Territorial' } },
  { section: 'employees', moduleCode: 'A', planned: true, label: { ar: 'سجل الموظفين (HR)', fr: 'Employés (RH)' } },
  { section: 'reports', moduleCode: 'L', label: { ar: 'تقارير المحفظة', fr: 'Rapports Portefeuille' } },
];

/**
 * Single authoritative navigation & workflow metadata for Context C (Active Project Workspace).
 */
export const PROJECT_ROUTE_META: readonly NavSectionMeta<ProjectWorkspaceSection>[] = [
  { section: 'overview', moduleCode: 'B', label: { ar: 'ملخص المشروع', fr: 'Synthèse projet' } },
  { section: 'structure', moduleCode: 'C', label: { ar: 'الهيكل العقاري', fr: 'Structure & lots' } },
  { section: 'customers', moduleCode: 'D', label: { ar: 'الزبائن والمهتمون', fr: 'Clients & CRM' } },
  { section: 'reservations', moduleCode: 'E', label: { ar: 'الحجوزات الداخلية', fr: 'Réservations' } },
  { section: 'contracts', moduleCode: 'F', planned: true, label: { ar: 'و. العقود', fr: 'F. Contrats' } },
  { section: 'finance', moduleCode: 'G', planned: true, label: { ar: 'ز. التحصيل', fr: 'G. Finances' } },
  { section: 'construction', moduleCode: 'H', planned: true, label: { ar: 'ح. الأشغال', fr: 'H. Chantier' } },
  { section: 'procurement', moduleCode: 'I', planned: true, label: { ar: 'ط. المشتريات', fr: 'I. Achats' } },
  { section: 'accounting', moduleCode: 'J', planned: true, label: { ar: 'ي. المحاسبة', fr: 'J. Comptabilité' } },
  { section: 'documents', moduleCode: 'K', label: { ar: 'الوثائق (K-Min)', fr: 'Documents' } },
  { section: 'reports', moduleCode: 'L', label: { ar: 'تقارير المشروع', fr: 'Rapports' } },
  { section: 'settings', moduleCode: 'B', label: { ar: 'الإعدادات والفريق', fr: 'Paramètres & équipe' } },
];

/**
 * Single authoritative navigation metadata for Context D (Technical Administration).
 */
export const ADMIN_ROUTE_META: readonly NavSectionMeta<TechnicalAdminSection>[] = [
  { section: 'users', moduleCode: 'A', label: { ar: 'حسابات الموظفين', fr: 'Comptes Employés' } },
  { section: 'audit', moduleCode: 'L', label: { ar: 'سجل التدقيق الأمني', fr: 'Journal d’Audit' } },
  { section: 'diagnostics', moduleCode: 'A', label: { ar: 'التشخيص المحلي', fr: 'Diagnostics Serveur' } },
];

const VALID_PROJECT_SECTIONS = new Set<ProjectWorkspaceSection>(
  PROJECT_ROUTE_META.map((item) => item.section)
);

export function parseAppLocation(pathname: string): AppRouteState {
  const clean = (pathname || '/').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  const segments = clean.split('/').filter(Boolean);

  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'workspace')) {
    return { kind: 'org', section: 'workspace' };
  }

  if (segments[0] === 'projects') {
    if (segments.length === 1) {
      return { kind: 'org', section: 'projects' };
    }
    const rawProjectId = segments[1];
    let projectId = '';
    try {
      projectId = decodeURIComponent(rawProjectId).trim();
    } catch {
      return { kind: 'org', section: 'projects' };
    }
    if (!projectId || projectId === '.' || projectId === '..') {
      return { kind: 'org', section: 'projects' };
    }
    const rawSection = (segments[2] ?? 'overview') as ProjectWorkspaceSection;
    const section = VALID_PROJECT_SECTIONS.has(rawSection) ? rawSection : 'overview';
    return { kind: 'project', projectId, section };
  }

  if (segments[0] === 'organization') {
    const sub = segments[1] ?? 'profile';
    if (sub === 'parties') return { kind: 'org', section: 'parties' };
    if (sub === 'employees') return { kind: 'org', section: 'employees' };
    if (sub === 'territorial-reference') return { kind: 'org', section: 'territorialReference' };
    return { kind: 'org', section: 'organizationProfile' };
  }

  if (segments[0] === 'reports') {
    return { kind: 'org', section: 'reports' };
  }

  if (segments[0] === 'admin') {
    const sub = segments[1] ?? 'users';
    if (sub === 'audit') return { kind: 'admin', section: 'audit' };
    if (sub === 'diagnostics') return { kind: 'admin', section: 'diagnostics' };
    return { kind: 'admin', section: 'users' };
  }

  return DEFAULT_APP_ROUTE;
}

export function buildAppPath(route: AppRouteState): string {
  if (route.kind === 'org') {
    switch (route.section) {
      case 'workspace':
        return '/';
      case 'projects':
        return '/projects';
      case 'organizationProfile':
        return '/organization/profile';
      case 'parties':
        return '/organization/parties';
      case 'employees':
        return '/organization/employees';
      case 'territorialReference':
        return '/organization/territorial-reference';
      case 'reports':
        return '/reports';
    }
  }

  if (route.kind === 'admin') {
    switch (route.section) {
      case 'users':
        return '/admin/users';
      case 'audit':
        return '/admin/audit';
      case 'diagnostics':
        return '/admin/diagnostics';
    }
  }

  const encodedId = encodeURIComponent(route.projectId);
  return route.section === 'overview'
    ? `/projects/${encodedId}/overview`
    : `/projects/${encodedId}/${route.section}`;
}

export function isSameRoute(a: AppRouteState, b: AppRouteState): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'project' && b.kind === 'project') {
    return a.projectId === b.projectId && a.section === b.section;
  }
  return a.section === b.section;
}

/** A navigation request is blocked only when a real draft exists and the destination changes. */
export function shouldBlockNavigation(
  hasUnsavedChanges: boolean,
  currentRoute: AppRouteState,
  nextRoute: AppRouteState,
): boolean {
  return hasUnsavedChanges && !isSameRoute(currentRoute, nextRoute);
}

export interface ShortcutTargetLike {
  tagName?: string | null;
  isContentEditable?: boolean | null;
  closest?: (selector: string) => unknown;
}

const EDITABLE_TAG_NAMES = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Global keyboard shortcuts (such as Ctrl/Cmd+K) must never hijack typing
 * or selection inside inputs, textareas, selects, or contentEditable hosts.
 */
export function shouldIgnoreGlobalShortcut(target: ShortcutTargetLike | null | undefined): boolean {
  if (!target) return false;
  const tagName = (target.tagName ?? '').toUpperCase();
  if (EDITABLE_TAG_NAMES.has(tagName)) return true;
  if (target.isContentEditable === true) return true;
  if (typeof target.closest === 'function') {
    if (target.closest('[contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]')) {
      return true;
    }
  }
  return false;
}

/**
 * Enforces organization-level and technical-admin route access before rendering
 * any protected view or letting direct URL entry bypass navigation filtering.
 */
export function canAccessRoute(user: AuthenticatedUser | null, route: AppRouteState): boolean {
  if (!user || !user.isActive) return false;

  if (route.kind === 'admin') {
    switch (route.section) {
      case 'users':
        return canManageUsers(user);
      case 'audit':
        return canViewAuditLogs(user);
      case 'diagnostics':
        return canViewTechnicalAdmin(user);
    }
  }

  if (route.kind === 'org' && route.section === 'parties') {
    return canReadPartyDirectory(user);
  }

  return true;
}

export function getDeniedRouteNotice(route: AppRouteState, language: AppLanguage): string {
  const isArabic = language === 'ar';
  if (route.kind === 'org' && route.section === 'parties') {
    return isArabic
      ? 'ليس لديك صلاحية الاطلاع على دليل الأطراف المركزي (parties.directory.read). تم توجيهك إلى مساحة المؤسسة.'
      : 'Vous ne disposez pas du droit de consultation du répertoire des tiers (parties.directory.read). Vous avez été redirigé vers l’espace organisation.';
  }
  return isArabic
    ? 'ليس لديك صلاحية الوصول إلى هذه الشاشة الإدارية. تم توجيهك إلى مساحة المؤسسة.'
    : 'Vous n’êtes pas autorisé à accéder à cet écran d’administration. Vous avez été redirigé vers l’espace organisation.';
}

/**
 * Removes stale cached project state and recent/pinned navigation entries
 * when a project's access is revoked or the project is no longer reachable.
 */
export function revokeProjectAccessFromState(
  projects: readonly ProjectDto[],
  preferences: ProjectNavigationPreferences,
  failedProjectId: string
): {
  projects: ProjectDto[];
  preferences: ProjectNavigationPreferences;
} {
  return {
    projects: projects.filter((p) => p.id !== failedProjectId),
    preferences: {
      recentProjectIds: preferences.recentProjectIds.filter((id) => id !== failedProjectId),
      pinnedProjectIds: preferences.pinnedProjectIds.filter((id) => id !== failedProjectId),
    },
  };
}
