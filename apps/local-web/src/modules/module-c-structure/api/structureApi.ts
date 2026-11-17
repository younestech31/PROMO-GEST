import { apiClient } from "@/core/api/apiClient";
import type { ProjectStructureDto } from "@/types/erp";

export const structureApi = {
  getProjectStructure: (projectId: string): Promise<ProjectStructureDto> =>
    apiClient.getProjectStructure(projectId),
};
