import { apiClient } from "@/core/api/apiClient";
import type { ProjectSalesReservationDto } from "@/types/erp";

export const reservationsApi = {
  listProjectSalesReservations: (projectId: string): Promise<ProjectSalesReservationDto[]> =>
    apiClient.listProjectSalesReservations(projectId),
};
