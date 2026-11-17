import { apiClient } from "@/core/api/apiClient";
import type { ProjectDocumentDto } from "@/types/erp";

export const documentsApi = {
  listProjectDocuments: (projectId: string): Promise<ProjectDocumentDto[]> =>
    apiClient.listProjectDocuments(projectId),
};
