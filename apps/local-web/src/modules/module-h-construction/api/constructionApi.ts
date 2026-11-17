import { createPlannedEndpointRejection } from '@/core/api/apiClient';

export const constructionApi = {
  listConstruction: (_projectId: string): Promise<never> =>
    createPlannedEndpointRejection('GET /api/projects/:projectId/construction', 'H-Construction'),
};
