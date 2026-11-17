import type { AppLanguage, AuthenticatedUser, ProjectDto } from '../types/erp';
import type { AppRouteState, ProjectNavigationPreferences } from './navigation';
import {
  canManageUsers,
  canReadPartyDirectory,
  canViewAuditLogs,
  canViewTechnicalAdmin,
} from './permissions';

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
