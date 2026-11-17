/**
 * Compatibility adapter for legacy navigation imports.
 * Route parsing and authorization metadata are owned by app/routeRegistry.ts;
 * optional project preferences are owned by shared/utils/navigationPreferences.ts.
 */
export type {
  AppRouteState,
  OrgWorkspaceSection,
  ProjectWorkspaceSection,
  TechnicalAdminSection,
} from '../core/modules/routeTypes';
export {
  DEFAULT_APP_ROUTE,
  ORG_ROUTE_META,
  PROJECT_ROUTE_META,
  ADMIN_ROUTE_META,
  buildAppPath,
  parseAppLocation,
  isSameRoute,
  shouldBlockNavigation,
  shouldIgnoreGlobalShortcut,
  canAccessRoute,
  getDeniedRouteNotice,
  revokeProjectAccessFromState,
} from '../app/routeRegistry';
export type { NavSectionMeta } from '../app/routeRegistry';
export {
  emptyProjectPreferences,
  recordRecentProjectId,
  togglePinnedProjectId,
  filterAuthorizedPreferenceIds,
  loadProjectNavigationPreferences,
  saveProjectNavigationPreferences,
} from '../shared/utils/navigationPreferences';
export type { ProjectNavigationPreferences } from '../shared/utils/navigationPreferences';
