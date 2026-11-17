/**
 * Compatibility adapter for legacy feature imports.
 * The only HTTP/CSRF implementation lives in core/api/apiClient.ts.
 * New modules should import from the core platform directly.
 */
export {
  apiClient,
  ApiError,
  ApiConnectionError,
  requestJson,
  requestBlob,
  createPlannedEndpointRejection,
} from '../core/api/apiClient';
