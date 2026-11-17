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
