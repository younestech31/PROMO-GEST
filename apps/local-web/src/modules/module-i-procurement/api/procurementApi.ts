import { createPlannedEndpointRejection } from '@/core/api/apiClient';

export const procurementApi = {
  listProcurement: (_projectId: string): Promise<never> =>
    createPlannedEndpointRejection('GET /api/projects/:projectId/procurement', 'I-Procurement'),
};
