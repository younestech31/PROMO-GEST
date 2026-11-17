import { createPlannedEndpointRejection } from '@/core/api/apiClient';

export const financeApi = {
  listFinance: (_projectId: string): Promise<never> =>
    createPlannedEndpointRejection('GET /api/projects/:projectId/finance', 'G-Finance'),
};
