import type { AppRouteState, TechnicalAdminSection } from "@/core/modules/routeTypes";

export const ADMIN_SECTION_ROUTES: Record<TechnicalAdminSection, AppRouteState> = {
  users: { kind: 'admin', section: 'users' },
  audit: { kind: 'admin', section: 'audit' },
  diagnostics: { kind: 'admin', section: 'diagnostics' },
};
