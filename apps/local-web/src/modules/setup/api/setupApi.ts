import { apiClient } from "@/core/api/apiClient";
import type { InitializeInstallationRequest, InitializeInstallationResponse, SetupStatusResponse } from "@/types/erp";

export const setupApi = {
  getSetupStatus: (): Promise<SetupStatusResponse> => apiClient.getSetupStatus(),
  initializeInstallation: (
    payload: InitializeInstallationRequest,
    bootstrapToken?: string
  ): Promise<InitializeInstallationResponse> => apiClient.initializeInstallation(payload, bootstrapToken),
};
