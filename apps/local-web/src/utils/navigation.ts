export type OrgWorkspaceSection =
  | 'workspace'
  | 'projects'
  | 'organizationProfile'
  | 'parties'
  | 'employees'
  | 'territorialReference'
  | 'reports';

export type ProjectWorkspaceSection =
  | 'overview'
  | 'structure'
  | 'customers'
  | 'reservations'
  | 'contracts'
  | 'finance'
  | 'construction'
  | 'procurement'
  | 'accounting'
  | 'documents'
  | 'reports'
  | 'settings';

export type TechnicalAdminSection = 'users' | 'audit' | 'diagnostics';

export type AppRouteState =
  | { kind: 'org'; section: OrgWorkspaceSection }
  | { kind: 'project'; projectId: string; section: ProjectWorkspaceSection }
  | { kind: 'admin'; section: TechnicalAdminSection };

export const DEFAULT_APP_ROUTE: AppRouteState = {
  kind: 'org',
  section: 'workspace',
};

const VALID_PROJECT_SECTIONS = new Set<ProjectWorkspaceSection>([
  'overview',
  'structure',
  'customers',
  'reservations',
  'contracts',
  'finance',
  'construction',
  'procurement',
  'accounting',
  'documents',
  'reports',
  'settings',
]);

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

export interface ProjectNavigationPreferences {
  recentProjectIds: string[];
  pinnedProjectIds: string[];
}

const MAX_RECENT_PROJECTS = 5;
const PREFS_STORAGE_PREFIX = 'promogest.navPrefs.v1.';

export function emptyProjectPreferences(): ProjectNavigationPreferences {
  return { recentProjectIds: [], pinnedProjectIds: [] };
}

export function recordRecentProjectId(
  prefs: ProjectNavigationPreferences,
  projectId: string
): ProjectNavigationPreferences {
  const cleanId = projectId.trim();
  if (!cleanId) return prefs;
  const nextRecent = [cleanId, ...prefs.recentProjectIds.filter((id) => id !== cleanId)].slice(
    0,
    MAX_RECENT_PROJECTS
  );
  return { ...prefs, recentProjectIds: nextRecent };
}

export function togglePinnedProjectId(
  prefs: ProjectNavigationPreferences,
  projectId: string
): ProjectNavigationPreferences {
  const cleanId = projectId.trim();
  if (!cleanId) return prefs;
  const exists = prefs.pinnedProjectIds.includes(cleanId);
  const nextPinned = exists
    ? prefs.pinnedProjectIds.filter((id) => id !== cleanId)
    : [cleanId, ...prefs.pinnedProjectIds];
  return { ...prefs, pinnedProjectIds: nextPinned };
}

export function filterAuthorizedPreferenceIds<T extends { id: string }>(
  ids: readonly string[],
  authorizedProjects: readonly T[]
): T[] {
  const byId = new Map<string, T>();
  for (const project of authorizedProjects) {
    byId.set(project.id, project);
  }
  const result: T[] = [];
  for (const id of ids) {
    const project = byId.get(id);
    if (project) result.push(project);
  }
  return result;
}

export function loadProjectNavigationPreferences(userId: string): ProjectNavigationPreferences {
  if (typeof window === 'undefined' || !userId) return emptyProjectPreferences();
  try {
    const raw = window.localStorage.getItem(`${PREFS_STORAGE_PREFIX}${userId}`);
    if (!raw) return emptyProjectPreferences();
    const parsed = JSON.parse(raw) as Partial<ProjectNavigationPreferences>;
    return {
      recentProjectIds: Array.isArray(parsed.recentProjectIds)
        ? parsed.recentProjectIds.filter((v): v is string => typeof v === 'string').slice(0, MAX_RECENT_PROJECTS)
        : [],
      pinnedProjectIds: Array.isArray(parsed.pinnedProjectIds)
        ? parsed.pinnedProjectIds.filter((v): v is string => typeof v === 'string')
        : [],
    };
  } catch {
    return emptyProjectPreferences();
  }
}

export function saveProjectNavigationPreferences(
  userId: string,
  prefs: ProjectNavigationPreferences
): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(`${PREFS_STORAGE_PREFIX}${userId}`, JSON.stringify(prefs));
  } catch {
    // Non-fatal: navigation preferences are strictly optional convenience state.
  }
}
