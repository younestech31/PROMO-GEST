import type { AuthenticatedUser, ProjectDto, ProjectMemberDto } from '../../types/erp';

export function hasPermission(user: AuthenticatedUser | null, permissionCode: string): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  return user.permissions.includes(permissionCode);
}

function getProjectMembership(
  user: AuthenticatedUser | null,
  project: ProjectDto
): ProjectMemberDto | undefined {
  if (!user || !user.isActive || user.isSystemAdministrator) return undefined;
  return project.members.find((member) => member.userId === user.id);
}

export function canManageUsers(user: AuthenticatedUser | null): boolean {
  return hasPermission(user, 'users.manage');
}

/** Budget visibility is an explicit per-project financial capability; SYSTEM_ADMIN does not bypass it. */
export function canViewProjectFinancials(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  return project.members.some((member) =>
    member.userId === user.id && member.canViewFinancials
  );
}

/** Budget editing requires both financial visibility and explicit Project Manager scope. */
export function canUpdateProjectFinancialBudget(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive || !hasPermission(user, 'projects.manage')) return false;
  return project.members.some((member) =>
    member.userId === user.id &&
    member.roleInProject === 'ProjectManager' &&
    member.canViewFinancials
  );
}

export function canCreateProject(user: AuthenticatedUser | null): boolean {
  return hasPermission(user, 'projects.create');
}

/** Project master-data management requires both the action permission and explicit Project Manager membership. */
export function canManageProjects(user: AuthenticatedUser | null, project?: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  if (!project || !hasPermission(user, 'projects.manage')) return false;
  return getProjectMembership(user, project)?.roleInProject === 'ProjectManager';
}

/** Managing a project's team is never granted by an organization-wide role alone. */
export function canManageProjectAccess(user: AuthenticatedUser | null, project?: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  if (!project || !hasPermission(user, 'projects.access.manage')) return false;
  return getProjectMembership(user, project)?.roleInProject === 'ProjectManager';
}

/** Project membership supplies the resource scope; global permission and project capabilities supply structure-management authority. */
export function canManageProjectStructure(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  if (!hasPermission(user, 'projects.structure.manage')) return false;
  const membership = getProjectMembership(user, project);
  return Boolean(membership && (
    membership.canManageConstruction || membership.roleInProject === 'ProjectManager'
  ));
}

export function canViewAuditLogs(user: AuthenticatedUser | null): boolean {
  return hasPermission(user, 'audit.read');
}

export function canReadProjectDocuments(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  return Boolean(getProjectMembership(user, project)) && hasPermission(user, 'files.read');
}

export function canUploadProjectDocuments(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  const membership = getProjectMembership(user, project);
  return Boolean(membership?.canManageDocuments) &&
    hasPermission(user, 'files.read') &&
    hasPermission(user, 'files.write');
}

export function canReadProjectCustomers(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  return Boolean(getProjectMembership(user, project)) && hasPermission(user, 'customers.read');
}

export function canManageProjectCustomers(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  const membership = getProjectMembership(user, project);
  const canManageSales = membership?.canManageSales === true ||
    membership?.roleInProject === 'ProjectManager';
  return canManageSales &&
    hasPermission(user, 'customers.read') &&
    hasPermission(user, 'customers.manage');
}

export function canReadProjectSalesReservations(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  return Boolean(getProjectMembership(user, project)) &&
    hasPermission(user, 'sales.reservations.read') &&
    hasPermission(user, 'customers.read');
}

export function canManageProjectSalesReservations(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  const membership = getProjectMembership(user, project);
  const canManageSales = membership?.canManageSales === true ||
    membership?.roleInProject === 'ProjectManager';
  return canManageSales &&
    hasPermission(user, 'sales.reservations.read') &&
    hasPermission(user, 'sales.reservations.manage') &&
    hasPermission(user, 'customers.read');
}

export function canReadPartyDirectory(user: AuthenticatedUser | null): boolean {
  return hasPermission(user, 'parties.directory.read');
}

export function canManagePartyIdentity(user: AuthenticatedUser | null): boolean {
  return hasPermission(user, 'parties.identity.manage');
}

export function canManageOrganizationProfile(user: AuthenticatedUser | null): boolean {
  return hasPermission(user, 'org.manage');
}

export function canViewTechnicalAdmin(user: AuthenticatedUser | null): boolean {
  if (!user || !user.isActive) return false;
  return user.isSystemAdministrator || canManageUsers(user) || canViewAuditLogs(user);
}
