import { apiClient } from "@/core/api/apiClient";
import type {
  AuditLogDto,
  CreateEmployeeRequest,
  HealthStatusResponse,
  RoleDto,
  UpdateEmployeeRequest,
  UserDto,
} from "@/types/erp";

export const adminApi = {
  listRoles: (): Promise<RoleDto[]> => apiClient.listRoles(),
  listUsers: (): Promise<UserDto[]> => apiClient.listUsers(),
  createEmployee: (payload: CreateEmployeeRequest): Promise<UserDto> => apiClient.createEmployee(payload),
  updateEmployee: (userId: string, payload: UpdateEmployeeRequest): Promise<UserDto> =>
    apiClient.updateEmployee(userId, payload),
  setUserStatus: (userId: string, isActive: boolean): Promise<UserDto> =>
    apiClient.setUserStatus(userId, isActive),
  resetUserPassword: (userId: string, newPassword: string): Promise<void> =>
    apiClient.resetUserPassword(userId, newPassword),
  listAuditLogs: (limit = 100): Promise<AuditLogDto[]> => apiClient.listAuditLogs(limit),
  healthReady: (): Promise<HealthStatusResponse> => apiClient.healthReady(),
};
