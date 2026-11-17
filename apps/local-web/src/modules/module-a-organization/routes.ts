import type { AppRouteState } from "@/core/modules/routeTypes";

export const ORG_SECTION_ROUTES: Record<
  'workspace' | 'organizationProfile' | 'territorialReference' | 'employees',
  AppRouteState
> = {
  workspace: { kind: 'org', section: 'workspace' },
  organizationProfile: { kind: 'org', section: 'organizationProfile' },
  territorialReference: { kind: 'org', section: 'territorialReference' },
  employees: { kind: 'org', section: 'employees' },
};
