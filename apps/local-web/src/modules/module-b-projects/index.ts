export { projectsApi } from './api/projectsApi';
export {
  canCreateProject,
  canManageProjects,
  canManageProjectAccess,
  canViewProjectFinancials,
  canUpdateProjectFinancialBudget,
} from './permissions';
export { getProjectWorkspaceRoute } from './routes';
export { ProjectSwitcherModal } from '@/components/ProjectSwitcherModal';
export { ProjectsAccessView } from '@/features/projects/ProjectsAccessView';
export { ProjectWorkspaceView } from '@/features/projects/ProjectWorkspaceView';
