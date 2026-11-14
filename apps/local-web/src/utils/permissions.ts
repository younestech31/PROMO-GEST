import type { AuthenticatedUser, ProjectDto } from '../types/erp';

export function hasPermission(user: AuthenticatedUser | null, permissionCode: string): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  return user.permissions.includes(permissionCode);
}

export function canManageUsers(user: AuthenticatedUser | null): boolean {
  return hasPermission(user, 'users.manage');
}

export function canCreateProject(user: AuthenticatedUser | null): boolean {
  return hasPermission(user, 'projects.create');
}

export function canManageProjects(user: AuthenticatedUser | null): boolean {
  return hasPermission(user, 'projects.manage');
}

export function canManageProjectAccess(user: AuthenticatedUser | null, project?: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator || hasPermission(user, 'projects.access.manage')) {
    return true;
  }
  if (!project) return false;
  return project.members.some(
    (m) => m.userId === user.id && m.roleInProject === 'ProjectManager'
  );
}

export function canManageProjectStructure(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (
    user.isSystemAdministrator ||
    hasPermission(user, 'projects.manage') ||
    hasPermission(user, 'projects.structure.manage')
  ) {
    return true;
  }
  return project.members.some(
    (member) =>
      member.userId === user.id &&
      (member.canManageConstruction || member.roleInProject === 'ProjectManager')
  );
}

export function canViewAuditLogs(user: AuthenticatedUser | null): boolean {
  return hasPermission(user, 'audit.read');
}
