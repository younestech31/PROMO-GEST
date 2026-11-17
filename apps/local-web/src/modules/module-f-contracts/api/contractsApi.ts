import { createPlannedEndpointRejection } from '@/core/api/apiClient';

export const contractsApi = {
  listContracts: (_projectId: string): Promise<never> =>
    createPlannedEndpointRejection('GET /api/projects/:projectId/contracts', 'F-Contracts'),
};
