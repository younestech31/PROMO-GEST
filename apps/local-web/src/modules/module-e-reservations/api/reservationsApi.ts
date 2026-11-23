import { apiClient } from "@/core/api/apiClient";
import type { ProjectSalesReservationDto, ReviewProjectSalesReservationRequest } from "@/types/erp";

export const reservationsApi = {
  listProjectSalesReservations: (
    projectId: string,
    options?: { reviewRequired?: boolean },
  ): Promise<ProjectSalesReservationDto[]> =>
    apiClient.listProjectSalesReservations(projectId, options),
  reviewProjectSalesReservation: (
    projectId: string,
    reservationId: string,
    payload: ReviewProjectSalesReservationRequest,
  ): Promise<ProjectSalesReservationDto> =>
    apiClient.reviewProjectSalesReservation(projectId, reservationId, payload),
};
