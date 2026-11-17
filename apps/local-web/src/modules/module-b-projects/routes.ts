import type { AppRouteState } from "@/core/modules/routeTypes";

export function getProjectWorkspaceRoute(projectId: string, section = 'overview'): AppRouteState {
  return { kind: 'project', projectId, section: section as never };
}
