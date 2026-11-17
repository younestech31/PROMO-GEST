import { createPlannedEndpointRejection } from '@/core/api/apiClient';

export const accountingApi = {
  listAccounting: (_projectId: string): Promise<never> =>
    createPlannedEndpointRejection('GET /api/projects/:projectId/accounting', 'J-Accounting'),
};
