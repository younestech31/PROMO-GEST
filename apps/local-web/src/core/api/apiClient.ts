import type {
  ApiErrorResponse,
  AdministrativeUnitsReferenceDto,
  PartyDirectoryItemDto,
  UpdatePartyIdentityRequest,
  ProjectDocumentDto,
  ProjectCustomerDto,
  ProjectSalesReservationDto,
  CreateProjectSalesReservationRequest,
  CancelProjectSalesReservationRequest,
  ProjectCustomerListItemDto,
  CreateProjectCustomerRequest,
  UpdateProjectCustomerRequest,
  AddCustomerInteractionRequest,
  CustomerInteractionDto,
  AssignProjectMemberRequest,
  AuditLogDto,
  CreateEmployeeRequest,
  CreateProjectRequest,
  CreateBuildingRequest,
  CreateBuildingFloorRequest,
  CreatePropertyUnitRequest,
  UpdateBuildingRequest,
  UpdateBuildingFloorRequest,
  UpdatePropertyUnitRequest,
  ChangePropertyUnitStatusRequest,
  ProjectStructureDto,
  HealthStatusResponse,
  InitializeInstallationRequest,
  InitializeInstallationResponse,
  LoginRequest,
  ProjectDto,
  RoleDto,
  SessionResponse,
  SetupStatusResponse,
  UpdateOrganizationProfileRequest,
  UpdateEmployeeRequest,
  UpdateProjectRequest,
  UserDto,
} from '../../types/erp';
import {
  isStateChangingMethod,
  parseCookieValue,
  requiresFreshCsrfToken,
  shouldRetryCsrfError,
} from './csrf';

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly validationErrors?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, validationErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.validationErrors = validationErrors;
  }
}

export class ApiConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConnectionError';
  }
}

let cachedCsrfToken: string | null = null;
let previewSessionToken: string | null = null;

async function ensureCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const fromCookie = typeof document !== 'undefined'
      ? parseCookieValue(document.cookie, 'promogest_csrf')
      : null;
    if (fromCookie) {
      cachedCsrfToken = fromCookie;
      return fromCookie;
    }
    if (cachedCsrfToken) {
      return cachedCsrfToken;
    }
  } else {
    cachedCsrfToken = null;
  }

  let response: Response;
  try {
    response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (err) {
    throw new ApiConnectionError(err instanceof Error ? err.message : 'Local server unreachable');
  }

  if (!response.ok) {
    throw new ApiError(response.status, 'CSRF_FETCH_FAILED', 'Unable to acquire anti-forgery token from local server.');
  }

  const headerToken = response.headers.get('X-CSRF-TOKEN');
  if (headerToken) {
    cachedCsrfToken = headerToken;
    return headerToken;
  }

  const data = (await response.json()) as { token?: string };
  if (!data.token) {
    throw new ApiConnectionError('Anti-forgery token response was empty.');
  }
  cachedCsrfToken = data.token;
  return data.token;
}

function syncCsrfCacheFromResponse(response: Response, resetIfMissing: boolean) {
  const headerToken = response.headers.get('X-CSRF-TOKEN');
  if (headerToken) {
    cachedCsrfToken = headerToken;
    return;
  }
  const cookieToken = typeof document !== 'undefined'
    ? parseCookieValue(document.cookie, 'promogest_csrf')
    : null;
  if (cookieToken) {
    cachedCsrfToken = cookieToken;
  } else if (resetIfMissing) {
    cachedCsrfToken = null;
  }
}

export async function requestJson<T>(url: string, init?: RequestInit, isRetry = false): Promise<T> {
  const method = init?.method ?? 'GET';
  const mutating = isStateChangingMethod(method);
  const csrfHeaders: Record<string, string> = {};

  if (mutating) {
    const forceFresh = isRetry || requiresFreshCsrfToken(url);
    csrfHeaders['X-CSRF-TOKEN'] = await ensureCsrfToken(forceFresh);
  }

  let response: Response;
  try {
    const previewHeaders: Record<string, string> = {};
    if (previewSessionToken) {
      previewHeaders.Authorization = `Bearer ${previewSessionToken}`;
    }

    response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        ...(typeof FormData !== 'undefined' && init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...previewHeaders,
        ...csrfHeaders,
        ...(init?.headers ?? {}),
      },
    });
  } catch (err) {
    throw new ApiConnectionError(err instanceof Error ? err.message : 'Local server unreachable');
  }

  const isAuthTransition = url === '/api/auth/login' || url === '/api/auth/logout';
  syncCsrfCacheFromResponse(response, isAuthTransition);

  if (url === '/api/auth/preview-session' && response.ok) {
    const token = response.headers.get('X-PROMOGEST-PREVIEW-TOKEN');
    if (!token) {
      throw new ApiConnectionError('Preview session response did not include its in-memory access token.');
    }
    previewSessionToken = token;
  }

  if ((url === '/api/auth/logout' && response.ok) || (url === '/api/auth/me' && response.status === 401)) {
    previewSessionToken = null;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      const payload = (await response.json()) as ApiErrorResponse;
      const code = payload.code ?? `HTTP_${response.status}`;
      if (shouldRetryCsrfError({ status: response.status, isMutating: mutating, isRetry, isJson: true, errorCode: code })) {
        await ensureCsrfToken(true);
        return requestJson<T>(url, init, true);
      }
      throw new ApiError(
        response.status,
        code,
        payload.message ?? `Request failed with status ${response.status}`,
        payload.validationErrors
      );
    }
    if (shouldRetryCsrfError({ status: response.status, isMutating: mutating, isRetry, isJson: false })) {
      await ensureCsrfToken(true);
      return requestJson<T>(url, init, true);
    }
    if (response.status === 403) {
      throw new ApiError(
        403,
        'HTTP_403_NON_JSON',
        `The preview host or reverse proxy returned a non-JSON 403 for ${url}; the request may have been blocked before the PROMO GEST API handled it.`
      );
    }
    throw new ApiError(
      response.status,
      `HTTP_${response.status}`,
      `Server responded with status ${response.status} (${contentType || 'unknown content type'}) for ${url}.`
    );
  }

  if (!isJson) {
    throw new ApiConnectionError('Unexpected non-JSON response from local server.');
  }

  return (await response.json()) as T;
}

export async function requestBlob(url: string): Promise<Blob> {
  let response: Response;
  try {
    const previewHeaders: Record<string, string> = {};
    if (previewSessionToken) {
      previewHeaders.Authorization = `Bearer ${previewSessionToken}`;
    }
    response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: previewHeaders,
      cache: 'no-store',
    });
  } catch (err) {
    throw new ApiConnectionError(err instanceof Error ? err.message : 'Local server unreachable');
  }

  syncCsrfCacheFromResponse(response, false);
  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as ApiErrorResponse;
      throw new ApiError(
        response.status,
        payload.code ?? `HTTP_${response.status}`,
        payload.message ?? `Request failed with status ${response.status}`,
        payload.validationErrors
      );
    }
    throw new ApiError(response.status, `HTTP_${response.status}`, `Document download failed with status ${response.status}.`);
  }

  return response.blob();
}

export function createPlannedEndpointRejection(endpoint: string, moduleCode: string): never {
  throw new ApiError(
    501,
    'MODULE_PLANNED',
    `Planned API endpoint ${endpoint} for Module ${moduleCode} is not implemented on the local ASP.NET Core backend yet.`
  );
}

export const apiClient = {
  healthReady: () => requestJson<HealthStatusResponse>('/health/ready', { method: 'GET' }),

  getAdministrativeUnits: () =>
    requestJson<AdministrativeUnitsReferenceDto>('/api/reference/administrative-units', {
      method: 'GET',
      cache: 'no-store',
    }),

  getSetupStatus: () => requestJson<SetupStatusResponse>('/api/setup/status', { method: 'GET', cache: 'no-store' }),

  initializeInstallation: (payload: InitializeInstallationRequest, bootstrapToken?: string) =>
    requestJson<InitializeInstallationResponse>('/api/setup/initialize', {
      method: 'POST',
      headers: bootstrapToken?.trim()
        ? { 'X-PROMOGEST-SETUP-TOKEN': bootstrapToken.trim() }
        : undefined,
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginRequest) =>
    requestJson<SessionResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  openPreviewSession: () =>
    requestJson<SessionResponse>('/api/auth/preview-session', { method: 'GET' }),

  logout: () => requestJson<void>('/api/auth/logout', { method: 'POST' }),

  getSession: () => requestJson<SessionResponse>('/api/auth/me', { method: 'GET' }),

  updateOrganizationProfile: (payload: UpdateOrganizationProfileRequest) =>
    requestJson<SessionResponse['organization']>('/api/organization', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  listRoles: () => requestJson<RoleDto[]>('/api/users/roles', { method: 'GET' }),

  listUsers: () => requestJson<UserDto[]>('/api/users', { method: 'GET' }),

  createEmployee: (payload: CreateEmployeeRequest) =>
    requestJson<UserDto>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateEmployee: (userId: string, payload: UpdateEmployeeRequest) =>
    requestJson<UserDto>(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  setUserStatus: (userId: string, isActive: boolean) =>
    requestJson<UserDto>(`/api/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),

  resetUserPassword: (userId: string, newPassword: string) =>
    requestJson<void>(`/api/users/${encodeURIComponent(userId)}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  listProjects: (params?: { q?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.q?.trim()) query.set('q', params.q.trim());
    if (params?.status?.trim()) query.set('status', params.status.trim());
    const qs = query.toString();
    return requestJson<ProjectDto[]>(qs ? `/api/projects?${qs}` : '/api/projects', {
      method: 'GET',
      cache: 'no-store',
    });
  },

  getProject: (projectId: string) =>
    requestJson<ProjectDto>(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'GET', cache: 'no-store' }),

  createProject: (payload: CreateProjectRequest) =>
    requestJson<ProjectDto>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProject: (projectId: string, payload: UpdateProjectRequest) =>
    requestJson<ProjectDto>(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  listProjectDocuments: (projectId: string) =>
    requestJson<ProjectDocumentDto[]>(`/api/projects/${encodeURIComponent(projectId)}/documents`, { method: 'GET', cache: 'no-store' }),

  uploadProjectDocument: (projectId: string, form: FormData) =>
    requestJson<ProjectDocumentDto>(`/api/projects/${encodeURIComponent(projectId)}/documents`, {
      method: 'POST',
      body: form,
    }),

  downloadProjectDocument: (projectId: string, fileId: string) =>
    requestBlob(`/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(fileId)}/download`),

  searchPartyDirectory: (query: string) =>
    requestJson<PartyDirectoryItemDto[]>(`/api/parties?query=${encodeURIComponent(query)}`, {
      method: 'GET',
      cache: 'no-store',
    }),

  updatePartyIdentity: (partyId: string, payload: UpdatePartyIdentityRequest) =>
    requestJson<PartyDirectoryItemDto>(`/api/parties/${encodeURIComponent(partyId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  listProjectCustomers: (projectId: string) =>
    requestJson<ProjectCustomerListItemDto[]>(`/api/projects/${encodeURIComponent(projectId)}/customers`, {
      method: 'GET',
      cache: 'no-store',
    }),

  getProjectCustomer: (projectId: string, customerId: string) =>
    requestJson<ProjectCustomerDto>(
      `/api/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(customerId)}`,
      { method: 'GET', cache: 'no-store' }
    ),

  createProjectCustomer: (projectId: string, payload: CreateProjectCustomerRequest) =>
    requestJson<ProjectCustomerDto>(`/api/projects/${encodeURIComponent(projectId)}/customers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProjectCustomer: (projectId: string, customerId: string, payload: UpdateProjectCustomerRequest) =>
    requestJson<ProjectCustomerDto>(
      `/api/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(customerId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  addCustomerInteraction: (projectId: string, customerId: string, payload: AddCustomerInteractionRequest) =>
    requestJson<CustomerInteractionDto>(
      `/api/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(customerId)}/interactions`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  listProjectSalesReservations: (projectId: string) =>
    requestJson<ProjectSalesReservationDto[]>(`/api/projects/${encodeURIComponent(projectId)}/reservations`, {
      method: 'GET',
      cache: 'no-store',
    }),

  createProjectSalesReservation: (projectId: string, payload: CreateProjectSalesReservationRequest) =>
    requestJson<ProjectSalesReservationDto>(`/api/projects/${encodeURIComponent(projectId)}/reservations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  cancelProjectSalesReservation: (
    projectId: string,
    reservationId: string,
    payload: CancelProjectSalesReservationRequest
  ) =>
    requestJson<ProjectSalesReservationDto>(
      `/api/projects/${encodeURIComponent(projectId)}/reservations/${encodeURIComponent(reservationId)}/cancel`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  getProjectStructure: (projectId: string) =>
    requestJson<ProjectStructureDto>(`/api/projects/${encodeURIComponent(projectId)}/structure`, {
      method: 'GET',
    }),

  createProjectBuilding: (projectId: string, payload: CreateBuildingRequest) =>
    requestJson<ProjectStructureDto>(`/api/projects/${encodeURIComponent(projectId)}/structure/buildings`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createBuildingFloor: (projectId: string, buildingId: string, payload: CreateBuildingFloorRequest) =>
    requestJson<ProjectStructureDto>(
      `/api/projects/${encodeURIComponent(projectId)}/structure/buildings/${encodeURIComponent(buildingId)}/floors`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  updateProjectBuilding: (projectId: string, buildingId: string, payload: UpdateBuildingRequest) =>
    requestJson<ProjectStructureDto>(
      `/api/projects/${encodeURIComponent(projectId)}/structure/buildings/${encodeURIComponent(buildingId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  updateBuildingFloor: (
    projectId: string,
    buildingId: string,
    floorId: string,
    payload: UpdateBuildingFloorRequest
  ) =>
    requestJson<ProjectStructureDto>(
      `/api/projects/${encodeURIComponent(projectId)}/structure/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  createFloorUnit: (
    projectId: string,
    buildingId: string,
    floorId: string,
    payload: CreatePropertyUnitRequest
  ) =>
    requestJson<ProjectStructureDto>(
      `/api/projects/${encodeURIComponent(projectId)}/structure/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/units`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),

  updatePropertyUnit: (
    projectId: string,
    buildingId: string,
    floorId: string,
    unitId: string,
    payload: UpdatePropertyUnitRequest
  ) =>
    requestJson<ProjectStructureDto>(
      `/api/projects/${encodeURIComponent(projectId)}/structure/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/units/${encodeURIComponent(unitId)}`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  changePropertyUnitStatus: (
    projectId: string,
    buildingId: string,
    floorId: string,
    unitId: string,
    payload: ChangePropertyUnitStatusRequest
  ) =>
    requestJson<ProjectStructureDto>(
      `/api/projects/${encodeURIComponent(projectId)}/structure/buildings/${encodeURIComponent(buildingId)}/floors/${encodeURIComponent(floorId)}/units/${encodeURIComponent(unitId)}/status`,
      { method: 'PUT', body: JSON.stringify(payload) }
    ),

  assignProjectMember: (projectId: string, payload: AssignProjectMemberRequest) =>
    requestJson<ProjectDto>(`/api/projects/${encodeURIComponent(projectId)}/members`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  removeProjectMember: (projectId: string, userId: string) =>
    requestJson<ProjectDto>(`/api/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }),

  listAuditLogs: (limit = 100) =>
    requestJson<AuditLogDto[]>(`/api/audit?limit=${limit}`, { method: 'GET' }),
};
