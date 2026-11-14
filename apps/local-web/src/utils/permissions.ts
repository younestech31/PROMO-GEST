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

export function canReadProjectDocuments(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  const isProjectScoped = project.members.some((member) => member.userId === user.id) ||
    user.permissions.includes('projects.manage');
  return isProjectScoped && user.permissions.includes('files.read');
}

export function canUploadProjectDocuments(user: AuthenticatedUser | null, project: ProjectDto): boolean {
  if (!user || !user.isActive) return false;
  if (user.isSystemAdministrator) return true;
  const membership = project.members.find((member) => member.userId === user.id);
  const isProjectScoped = Boolean(membership) || user.permissions.includes('projects.manage');
  const hasDocumentManagement = membership?.canManageDocuments === true ||
    user.permissions.includes('projects.manage');
  return isProjectScoped && hasDocumentManagement &&
    user.permissions.includes('files.read') && user.permissions.includes('files.write');
}
