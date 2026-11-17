import { apiClient } from "@/core/api/apiClient";
import type {
  AssignProjectMemberRequest,
  CreateProjectRequest,
  ProjectDto,
  UpdateProjectRequest,
} from "@/types/erp";

export const projectsApi = {
  listProjects: (params?: { q?: string; status?: string }): Promise<ProjectDto[]> =>
    apiClient.listProjects(params),
  getProject: (projectId: string): Promise<ProjectDto> => apiClient.getProject(projectId),
  createProject: (payload: CreateProjectRequest): Promise<ProjectDto> => apiClient.createProject(payload),
  updateProject: (projectId: string, payload: UpdateProjectRequest): Promise<ProjectDto> =>
    apiClient.updateProject(projectId, payload),
  assignProjectMember: (projectId: string, payload: AssignProjectMemberRequest): Promise<ProjectDto> =>
    apiClient.assignProjectMember(projectId, payload),
  removeProjectMember: (projectId: string, userId: string): Promise<ProjectDto> =>
    apiClient.removeProjectMember(projectId, userId),
};
