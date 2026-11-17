import { apiClient, createPlannedEndpointRejection } from "@/core/api/apiClient";
import type {
  AdministrativeUnitsReferenceDto,
  OrganizationSummary,
  UpdateOrganizationProfileRequest,
} from "@/types/erp";

export const PLANNED_EMPLOYEES_ENDPOINTS = [
  'GET /api/employees',
  'POST /api/employees',
  'PUT /api/employees/:employeeId',
] as const;

export const organizationApi = {
  getAdministrativeUnits: (): Promise<AdministrativeUnitsReferenceDto> => apiClient.getAdministrativeUnits(),
  updateOrganizationProfile: (payload: UpdateOrganizationProfileRequest): Promise<OrganizationSummary> =>
    apiClient.updateOrganizationProfile(payload),
  listEmployeesPlanned: (): Promise<never> =>
    createPlannedEndpointRejection('GET /api/employees', 'A-HR'),
};
