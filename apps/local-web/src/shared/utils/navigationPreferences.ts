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
