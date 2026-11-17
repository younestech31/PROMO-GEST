import { createPlannedEndpointRejection } from '@/core/api/apiClient';

/**
 * Reporting domain capabilities are not backed by production API endpoints yet.
 * Never return a successful empty result that could be mistaken for real reporting data.
 */
export const reportingApi = {
  listReports: (_scope: 'organization' | 'project' = 'organization'): never =>
    createPlannedEndpointRejection('GET /api/reports', 'L-Reporting'),
};
