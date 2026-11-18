import { apiClient } from "@/core/api/apiClient";
import type { LoginRequest, SessionResponse } from "@/types/erp";

export const authApi = {
  login: (payload: LoginRequest): Promise<SessionResponse> => apiClient.login(payload),
  logout: (): Promise<void> => apiClient.logout(),
  getSession: (): Promise<SessionResponse> => apiClient.getSession(),
  healthReady: () => apiClient.healthReady(),
};
