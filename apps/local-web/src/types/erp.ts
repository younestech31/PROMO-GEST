export type AppLanguage = 'ar' | 'fr';

export interface ApiErrorResponse {
  code: string;
  message: string;
  validationErrors?: Record<string, string[]>;
}

export interface SetupStatusResponse {
  isInitialized: boolean;
  organizationLegalName: string | null;
  defaultLanguage: AppLanguage | null;
  initializedAtUtc: string | null;
}

export interface InitializeInstallationRequest {
  legalName: string;
  tradeName?: string;
  legalForm: string;
  nif?: string;
  nis?: string;
  tradeRegisterNumber?: string;
  taxArticleNumber?: string;
  shareCapitalDzd?: number | null;
  wilayaCode: string;
  wilayaName: string;
  address: string;
  organizationPhone?: string;
  organizationEmail?: string;
  defaultLanguage: AppLanguage;
  adminUsername: string;
  adminFullName: string;
  adminEmail: string;
  adminPhone?: string;
  adminPassword: string;
}

export interface InitializeInstallationResponse {
  organizationId: string;
  organizationLegalName: string;
  systemAdminUserId: string;
  systemAdminUsername: string;
  initializedAtUtc: string;
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  isSystemAdministrator: boolean;
  isActive: boolean;
  preferredLanguage: AppLanguage;
  roles: string[];
  permissions: string[];
  lastLoginAtUtc: string | null;
}

export interface OrganizationSummary {
  id: string;
  legalName: string;
  tradeName: string | null;
  legalForm: string;
  nif: string | null;
  nis: string | null;
  tradeRegisterNumber: string | null;
  taxArticleNumber: string | null;
  shareCapitalDzd: number | null;
  wilayaCode: string;
  wilayaName: string;
  address: string;
  phone: string | null;
  email: string | null;
  defaultLanguage: AppLanguage;
  currencyCode: 'DZD';
}

export interface SessionResponse {
  user: AuthenticatedUser;
  organization: OrganizationSummary;
}

export interface RoleDto {
  id: string;
  code: string;
  nameAr: string;
  nameFr: string;
  descriptionAr: string;
  descriptionFr: string;
  isSystemRole: boolean;
}

export interface UserDto {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string | null;
  isSystemAdministrator: boolean;
  isActive: boolean;
  preferredLanguage: AppLanguage;
  failedLoginAttempts: number;
  lockoutEndUtc: string | null;
  lastLoginAtUtc: string | null;
  createdAtUtc: string;
  roleCodes: string[];
}

export interface CreateEmployeeRequest {
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  preferredLanguage: AppLanguage;
  roleCodes: string[];
}

export interface UpdateEmployeeRequest {
  fullName: string;
  email: string;
  phone?: string;
  preferredLanguage: AppLanguage;
  roleCodes: string[];
}

export interface ProjectMemberDto {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  roleInProject: string;
  canViewFinancials: boolean;
  canManageSales: boolean;
  canManageConstruction: boolean;
  canManageDocuments: boolean;
  assignedAtUtc: string;
}

export interface ProjectDto {
  id: string;
  code: string;
  nameAr: string;
  nameFr: string;
  wilayaCode: string;
  wilayaName: string;
  municipality: string;
  address: string | null;
  landTitleReference: string | null;
  buildingPermitNumber: string | null;
  buildingPermitDate: string | null;
  status: string;
  estimatedBudgetDzd: number;
  plannedBlocksCount: number;
  plannedUnitsCount: number;
  createdAtUtc: string;
  members: ProjectMemberDto[];
}

export interface CreateProjectRequest {
  code: string;
  nameAr: string;
  nameFr: string;
  wilayaCode: string;
  wilayaName: string;
  municipality: string;
  address?: string;
  landTitleReference?: string;
  buildingPermitNumber?: string;
  buildingPermitDate?: string | null;
  status: string;
  estimatedBudgetDzd: number;
  plannedBlocksCount: number;
  plannedUnitsCount: number;
}

export type UpdateProjectRequest = Omit<CreateProjectRequest, 'code'>;

export interface PropertyUnitDto {
  id: string;
  floorId: string;
  unitNumber: string;
  unitType: string;
  status: string;
  grossAreaSquareMeters: number | null;
  netAreaSquareMeters: number | null;
  roomsCount: number | null;
  createdAtUtc: string;
}

export interface BuildingFloorDto {
  id: string;
  buildingId: string;
  floorNumber: number;
  nameAr: string;
  nameFr: string;
  createdAtUtc: string;
  units: PropertyUnitDto[];
}

export interface BuildingStructureDto {
  id: string;
  projectId: string;
  code: string;
  nameAr: string;
  nameFr: string;
  status: string;
  createdAtUtc: string;
  floors: BuildingFloorDto[];
}

export interface ProjectStructureDto {
  projectId: string;
  buildings: BuildingStructureDto[];
}

export interface CreateBuildingRequest {
  code: string;
  nameAr: string;
  nameFr: string;
  status: string;
}

export interface CreateBuildingFloorRequest {
  floorNumber: number;
  nameAr: string;
  nameFr: string;
}

export interface CreatePropertyUnitRequest {
  unitNumber: string;
  unitType: string;
  status: string;
  grossAreaSquareMeters?: number | null;
  netAreaSquareMeters?: number | null;
  roomsCount?: number | null;
}

export interface AssignProjectMemberRequest {
  userId: string;
  roleInProject: string;
  canViewFinancials: boolean;
  canManageSales: boolean;
  canManageConstruction: boolean;
  canManageDocuments: boolean;
}

export interface AuditLogDto {
  id: string;
  occurredAtUtc: string;
  actorUserId: string | null;
  actorUsername: string | null;
  eventType: string;
  severity: string;
  targetEntityType: string | null;
  targetEntityId: string | null;
  summary: string;
  ipAddress: string | null;
}

export interface HealthStatusResponse {
  status: string;
  databaseConnected: boolean;
  isInitialized: boolean;
  timestampUtc: string;
  environmentMode: string;
  previewMode?: boolean;
}
