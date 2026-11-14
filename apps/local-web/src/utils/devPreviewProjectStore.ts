import crypto from 'node:crypto';
import type {
  BuildingFloorDto,
  BuildingStructureDto,
  ChangePropertyUnitStatusRequest,
  CreateBuildingFloorRequest,
  CreateBuildingRequest,
  CreatePropertyUnitRequest,
  ProjectDto,
  ProjectStructureDto,
  PropertyUnitDto,
  UpdateBuildingFloorRequest,
  UpdateBuildingRequest,
  UpdateProjectRequest,
  UpdatePropertyUnitRequest,
} from '../types/erp';

export const PROJECT_STATUSES = ['Planning', 'UnderConstruction', 'Commercialization', 'Delivered', 'Suspended'] as const;
export const BUILDING_STATUSES = ['Planned', 'UnderConstruction', 'Completed', 'Suspended'] as const;
export const UNIT_TYPES = ['Apartment', 'Shop', 'ParkingSpace', 'Office', 'Storage'] as const;
export const ALL_UNIT_STATUSES = [
  'Planned',
  'UnderConstruction',
  'AvailableForSale',
  'Reserved',
  'Sold',
  'Delivered',
  'Withdrawn',
] as const;

const SALES_LOCKED_UNIT_STATUSES = new Set(['Reserved', 'Sold', 'Delivered']);
const ALLOWED_UNIT_TRANSITIONS: Record<string, readonly string[]> = {
  Planned: ['UnderConstruction', 'Withdrawn'],
  UnderConstruction: ['AvailableForSale', 'Withdrawn'],
  AvailableForSale: ['Withdrawn'],
};

export class DevPreviewStoreError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'DevPreviewStoreError';
    this.status = status;
    this.code = code;
  }
}

export interface PreviewUserContext {
  id: string;
  isSystemAdministrator: boolean;
  permissions: readonly string[];
}

export function canUserAccessProjectStructure(
  user: PreviewUserContext,
  project: ProjectDto,
  canManage: boolean
): boolean {
  if (user.isSystemAdministrator) return true;
  const hasGlobalManagement =
    user.permissions.includes('projects.manage') ||
    user.permissions.includes('projects.structure.manage');
  if (hasGlobalManagement) return true;

  const membership = project.members.find((m) => m.userId === user.id);
  if (!canManage) {
    return Boolean(membership);
  }
  return Boolean(
    membership && (membership.canManageConstruction || membership.roleInProject === 'ProjectManager')
  );
}

export function computeProjectStructureCounts(structure?: ProjectStructureDto): {
  actualBuildingsCount: number;
  actualUnitsCount: number;
} {
  if (!structure) {
    return { actualBuildingsCount: 0, actualUnitsCount: 0 };
  }
  let actualUnitsCount = 0;
  for (const building of structure.buildings) {
    for (const floor of building.floors) {
      actualUnitsCount += floor.units.length;
    }
  }
  return {
    actualBuildingsCount: structure.buildings.length,
    actualUnitsCount,
  };
}

export function withComputedStructureCounts(
  project: ProjectDto,
  structures: ReadonlyMap<string, ProjectStructureDto>
): ProjectDto {
  const counts = computeProjectStructureCounts(structures.get(project.id));
  return {
    ...project,
    actualBuildingsCount: counts.actualBuildingsCount,
    actualUnitsCount: counts.actualUnitsCount,
  };
}

export function updateProjectInStore(
  project: ProjectDto,
  request: UpdateProjectRequest
): ProjectDto {
  const { ar, fr } = normalizeRequiredText(
    request.nameAr,
    request.nameFr,
    200,
    'PROJECT_NAME_REQUIRED',
    'PROJECT_NAME_TOO_LONG',
    'Project name'
  );

  const wilayaCode = (request.wilayaCode ?? '').trim();
  if (!/^(0[1-9]|[1-4]\d|5[0-8])$/.test(wilayaCode)) {
    throw new DevPreviewStoreError(400, 'PROJECT_WILAYA_INVALID', 'Valid two-digit Algerian Wilaya code (01-58) is required.');
  }
  const wilayaName = (request.wilayaName ?? '').trim();
  if (!wilayaName) {
    throw new DevPreviewStoreError(400, 'PROJECT_WILAYA_NAME_REQUIRED', 'Wilaya name is required.');
  }
  const municipality = (request.municipality ?? '').trim();
  if (!municipality) {
    throw new DevPreviewStoreError(400, 'PROJECT_MUNICIPALITY_REQUIRED', 'Municipality (Commune) is required.');
  }
  const status = (request.status ?? '').trim();
  if (!(PROJECT_STATUSES as readonly string[]).includes(status)) {
    throw new DevPreviewStoreError(400, 'PROJECT_STATUS_INVALID', 'A valid project status is required.');
  }

  const estimatedBudgetDzd = Number(request.estimatedBudgetDzd ?? 0);
  if (!Number.isFinite(estimatedBudgetDzd) || estimatedBudgetDzd < 0 || estimatedBudgetDzd > 9_999_999_999_999_999.99) {
    throw new DevPreviewStoreError(400, 'PROJECT_BUDGET_INVALID', 'Estimated budget must fit the supported non-negative DZD range.');
  }

  const plannedBlocksCount = Number(request.plannedBlocksCount ?? 0);
  const plannedUnitsCount = Number(request.plannedUnitsCount ?? 0);
  if (!Number.isInteger(plannedBlocksCount) || plannedBlocksCount < 0 || !Number.isInteger(plannedUnitsCount) || plannedUnitsCount < 0) {
    throw new DevPreviewStoreError(400, 'PROJECT_COUNTS_NEGATIVE', 'Planned blocks and units counts cannot be negative.');
  }

  project.nameAr = ar;
  project.nameFr = fr;
  project.wilayaCode = wilayaCode;
  project.wilayaName = wilayaName;
  project.municipality = municipality;
  project.address = request.address?.trim() || null;
  project.landTitleReference = request.landTitleReference?.trim() || null;
  project.buildingPermitNumber = request.buildingPermitNumber?.trim() || null;
  project.buildingPermitDate = request.buildingPermitDate?.trim() || null;
  project.status = status;
  project.estimatedBudgetDzd = estimatedBudgetDzd;
  project.plannedBlocksCount = plannedBlocksCount;
  project.plannedUnitsCount = plannedUnitsCount;
  return project;
}

function sortStructure(projectId: string, buildings: BuildingStructureDto[]): ProjectStructureDto {
  const sortedBuildings = [...buildings]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((building) => ({
      ...building,
      floors: [...building.floors]
        .sort((a, b) => a.floorNumber - b.floorNumber)
        .map((floor) => ({
          ...floor,
          units: [...floor.units].sort((a, b) => a.unitNumber.localeCompare(b.unitNumber)),
        })),
    }));
  return { projectId, buildings: sortedBuildings };
}

export function getProjectStructure(
  structures: ReadonlyMap<string, ProjectStructureDto>,
  projectId: string
): ProjectStructureDto {
  const existing = structures.get(projectId);
  if (!existing) {
    return { projectId, buildings: [] };
  }
  return sortStructure(projectId, existing.buildings);
}

function normalizeRequiredText(
  primary: string | undefined,
  fallback: string | undefined,
  maxLength: number,
  requiredCode: string,
  tooLongCode: string,
  fieldLabel: string
): { ar: string; fr: string } {
  const trimmedPrimary = (primary ?? '').trim();
  const trimmedFallback = (fallback ?? '').trim();
  if (!trimmedPrimary && !trimmedFallback) {
    throw new DevPreviewStoreError(400, requiredCode, `${fieldLabel} in Arabic or French is required.`);
  }
  const ar = trimmedPrimary || trimmedFallback;
  const fr = trimmedFallback || trimmedPrimary;
  if (ar.length > maxLength || fr.length > maxLength) {
    throw new DevPreviewStoreError(400, tooLongCode, `${fieldLabel} must not exceed ${maxLength} characters.`);
  }
  return { ar, fr };
}

function validateUnitMeasurements(
  grossArea: number | null | undefined,
  netArea: number | null | undefined,
  roomsCount: number | null | undefined
): { gross: number | null; net: number | null; rooms: number | null } {
  const gross = grossArea === undefined || grossArea === null ? null : Number(grossArea);
  const net = netArea === undefined || netArea === null ? null : Number(netArea);
  const rooms = roomsCount === undefined || roomsCount === null ? null : Number(roomsCount);
  const maxArea = 99_999_999.99;

  if (
    (gross !== null && (!Number.isFinite(gross) || gross < 0 || gross > maxArea)) ||
    (net !== null && (!Number.isFinite(net) || net < 0 || net > maxArea))
  ) {
    throw new DevPreviewStoreError(400, 'UNIT_AREA_INVALID', 'Unit areas must be non-negative and fit the supported range.');
  }

  if (gross !== null && net !== null && net > gross) {
    throw new DevPreviewStoreError(400, 'UNIT_NET_AREA_EXCEEDS_GROSS', 'Net area cannot exceed gross area.');
  }

  if (rooms !== null && (!Number.isInteger(rooms) || rooms < 0 || rooms > 20)) {
    throw new DevPreviewStoreError(400, 'UNIT_ROOMS_COUNT_INVALID', 'Room count must be between 0 and 20.');
  }

  return { gross, net, rooms };
}

export function createBuildingInStore(
  structures: Map<string, ProjectStructureDto>,
  projectId: string,
  request: CreateBuildingRequest,
  nowIso: string
): { structure: ProjectStructureDto; building: BuildingStructureDto } {
  const status = (request.status ?? '').trim();
  if (!(BUILDING_STATUSES as readonly string[]).includes(status)) {
    throw new DevPreviewStoreError(400, 'BUILDING_STATUS_INVALID', 'A valid building status is required.');
  }

  const normalizedCode = (request.code ?? '').trim().toUpperCase();
  if (!normalizedCode) {
    throw new DevPreviewStoreError(400, 'BUILDING_CODE_REQUIRED', 'Building code is required.');
  }
  if (normalizedCode.length > 40) {
    throw new DevPreviewStoreError(400, 'BUILDING_CODE_TOO_LONG', 'Building code must not exceed 40 characters.');
  }

  const { ar, fr } = normalizeRequiredText(
    request.nameAr,
    request.nameFr,
    200,
    'BUILDING_NAME_REQUIRED',
    'BUILDING_NAME_TOO_LONG',
    'Building name'
  );

  const current = structures.get(projectId) ?? { projectId, buildings: [] };
  if (current.buildings.some((b) => b.code.toUpperCase() === normalizedCode)) {
    throw new DevPreviewStoreError(409, 'BUILDING_CODE_EXISTS', 'A building with this code already exists in the project.');
  }

  const building: BuildingStructureDto = {
    id: crypto.randomUUID(),
    projectId,
    code: normalizedCode,
    nameAr: ar,
    nameFr: fr,
    status,
    createdAtUtc: nowIso,
    updatedAtUtc: nowIso,
    concurrencyStamp: crypto.randomUUID(),
    floors: [],
  };

  current.buildings.push(building);
  structures.set(projectId, current);
  return { structure: getProjectStructure(structures, projectId), building };
}

export function updateBuildingInStore(
  structures: Map<string, ProjectStructureDto>,
  projectId: string,
  buildingId: string,
  request: UpdateBuildingRequest,
  nowIso: string
): { structure: ProjectStructureDto; building: BuildingStructureDto; previousCode: string } {
  const current = structures.get(projectId);
  const building = current?.buildings.find((b) => b.id === buildingId);
  if (!building) {
    throw new DevPreviewStoreError(404, 'BUILDING_NOT_FOUND', 'Building not found in this project.');
  }

  if (!request.expectedConcurrencyStamp || building.concurrencyStamp !== request.expectedConcurrencyStamp) {
    throw new DevPreviewStoreError(
      409,
      'CONCURRENCY_CONFLICT',
      'This record changed after it was loaded. Reload it before saving.'
    );
  }

  const status = (request.status ?? '').trim();
  if (!(BUILDING_STATUSES as readonly string[]).includes(status)) {
    throw new DevPreviewStoreError(400, 'BUILDING_STATUS_INVALID', 'A valid building status is required.');
  }

  const normalizedCode = (request.code ?? '').trim().toUpperCase();
  if (!normalizedCode) {
    throw new DevPreviewStoreError(400, 'BUILDING_CODE_REQUIRED', 'Building code is required.');
  }
  if (normalizedCode.length > 40) {
    throw new DevPreviewStoreError(400, 'BUILDING_CODE_TOO_LONG', 'Building code must not exceed 40 characters.');
  }

  const { ar, fr } = normalizeRequiredText(
    request.nameAr,
    request.nameFr,
    200,
    'BUILDING_NAME_REQUIRED',
    'BUILDING_NAME_TOO_LONG',
    'Building name'
  );

  if (current!.buildings.some((b) => b.id !== buildingId && b.code.toUpperCase() === normalizedCode)) {
    throw new DevPreviewStoreError(409, 'BUILDING_CODE_EXISTS', 'A building with this code already exists in the project.');
  }

  const previousCode = building.code;
  building.code = normalizedCode;
  building.nameAr = ar;
  building.nameFr = fr;
  building.status = status;
  building.updatedAtUtc = nowIso;
  building.concurrencyStamp = crypto.randomUUID();

  return { structure: getProjectStructure(structures, projectId), building, previousCode };
}

export function createFloorInStore(
  structures: Map<string, ProjectStructureDto>,
  projectId: string,
  buildingId: string,
  request: CreateBuildingFloorRequest,
  nowIso: string
): { structure: ProjectStructureDto; building: BuildingStructureDto; floor: BuildingFloorDto } {
  const current = structures.get(projectId);
  const building = current?.buildings.find((b) => b.id === buildingId);
  if (!building) {
    throw new DevPreviewStoreError(404, 'BUILDING_NOT_FOUND', 'Building not found in this project.');
  }

  const floorNumber = Number(request.floorNumber);
  if (!Number.isInteger(floorNumber) || floorNumber < -10 || floorNumber > 200) {
    throw new DevPreviewStoreError(400, 'FLOOR_NUMBER_INVALID', 'Floor number must be between -10 and 200.');
  }

  const { ar, fr } = normalizeRequiredText(
    request.nameAr,
    request.nameFr,
    100,
    'FLOOR_NAME_REQUIRED',
    'FLOOR_NAME_TOO_LONG',
    'Floor name'
  );

  if (building.floors.some((f) => f.floorNumber === floorNumber)) {
    throw new DevPreviewStoreError(409, 'FLOOR_NUMBER_EXISTS', 'This floor number already exists in the building.');
  }

  const floor: BuildingFloorDto = {
    id: crypto.randomUUID(),
    buildingId,
    floorNumber,
    nameAr: ar,
    nameFr: fr,
    createdAtUtc: nowIso,
    updatedAtUtc: nowIso,
    concurrencyStamp: crypto.randomUUID(),
    units: [],
  };

  building.floors.push(floor);
  return { structure: getProjectStructure(structures, projectId), building, floor };
}

export function updateFloorInStore(
  structures: Map<string, ProjectStructureDto>,
  projectId: string,
  buildingId: string,
  floorId: string,
  request: UpdateBuildingFloorRequest,
  nowIso: string
): { structure: ProjectStructureDto; building: BuildingStructureDto; floor: BuildingFloorDto; previousNumber: number } {
  const current = structures.get(projectId);
  const building = current?.buildings.find((b) => b.id === buildingId);
  if (!building) {
    throw new DevPreviewStoreError(404, 'BUILDING_NOT_FOUND', 'Building not found in this project.');
  }

  const floor = building.floors.find((f) => f.id === floorId);
  if (!floor) {
    throw new DevPreviewStoreError(404, 'FLOOR_NOT_FOUND', 'Floor not found in this building.');
  }

  if (!request.expectedConcurrencyStamp || floor.concurrencyStamp !== request.expectedConcurrencyStamp) {
    throw new DevPreviewStoreError(
      409,
      'CONCURRENCY_CONFLICT',
      'This record changed after it was loaded. Reload it before saving.'
    );
  }

  const floorNumber = Number(request.floorNumber);
  if (!Number.isInteger(floorNumber) || floorNumber < -10 || floorNumber > 200) {
    throw new DevPreviewStoreError(400, 'FLOOR_NUMBER_INVALID', 'Floor number must be between -10 and 200.');
  }

  const { ar, fr } = normalizeRequiredText(
    request.nameAr,
    request.nameFr,
    100,
    'FLOOR_NAME_REQUIRED',
    'FLOOR_NAME_TOO_LONG',
    'Floor name'
  );

  if (building.floors.some((f) => f.id !== floorId && f.floorNumber === floorNumber)) {
    throw new DevPreviewStoreError(409, 'FLOOR_NUMBER_EXISTS', 'This floor number already exists in the building.');
  }

  const previousNumber = floor.floorNumber;
  floor.floorNumber = floorNumber;
  floor.nameAr = ar;
  floor.nameFr = fr;
  floor.updatedAtUtc = nowIso;
  floor.concurrencyStamp = crypto.randomUUID();

  return { structure: getProjectStructure(structures, projectId), building, floor, previousNumber };
}

export function createUnitInStore(
  structures: Map<string, ProjectStructureDto>,
  projectId: string,
  buildingId: string,
  floorId: string,
  request: CreatePropertyUnitRequest,
  nowIso: string
): { structure: ProjectStructureDto; building: BuildingStructureDto; floor: BuildingFloorDto; unit: PropertyUnitDto } {
  const current = structures.get(projectId);
  const building = current?.buildings.find((b) => b.id === buildingId);
  if (!building) {
    throw new DevPreviewStoreError(404, 'BUILDING_NOT_FOUND', 'Building not found in this project.');
  }

  const floor = building.floors.find((f) => f.id === floorId);
  if (!floor) {
    throw new DevPreviewStoreError(404, 'FLOOR_NOT_FOUND', 'Floor not found in this building.');
  }

  const unitType = (request.unitType ?? '').trim();
  if (!(UNIT_TYPES as readonly string[]).includes(unitType)) {
    throw new DevPreviewStoreError(400, 'UNIT_TYPE_INVALID', 'A valid property unit type is required.');
  }

  const status = (request.status ?? '').trim();
  if (!(ALL_UNIT_STATUSES as readonly string[]).includes(status)) {
    throw new DevPreviewStoreError(400, 'UNIT_STATUS_INVALID', 'A valid property unit status is required.');
  }
  if (SALES_LOCKED_UNIT_STATUSES.has(status)) {
    throw new DevPreviewStoreError(
      400,
      'UNIT_STATUS_REQUIRES_SALES_WORKFLOW',
      'Reserved, sold, and delivered states can only be assigned by the sales and contract workflow.'
    );
  }

  const normalizedUnitNumber = (request.unitNumber ?? '').trim().toUpperCase();
  if (!normalizedUnitNumber) {
    throw new DevPreviewStoreError(400, 'UNIT_NUMBER_REQUIRED', 'Property unit number is required.');
  }
  if (normalizedUnitNumber.length > 40) {
    throw new DevPreviewStoreError(400, 'UNIT_NUMBER_TOO_LONG', 'Property unit number must not exceed 40 characters.');
  }

  if (floor.units.some((u) => u.unitNumber.toUpperCase() === normalizedUnitNumber)) {
    throw new DevPreviewStoreError(409, 'UNIT_NUMBER_EXISTS', 'A property unit with this number already exists on the floor.');
  }

  const measurements = validateUnitMeasurements(
    request.grossAreaSquareMeters,
    request.netAreaSquareMeters,
    request.roomsCount
  );

  const unit: PropertyUnitDto = {
    id: crypto.randomUUID(),
    floorId,
    unitNumber: normalizedUnitNumber,
    unitType,
    status,
    grossAreaSquareMeters: measurements.gross,
    netAreaSquareMeters: measurements.net,
    roomsCount: measurements.rooms,
    createdAtUtc: nowIso,
    updatedAtUtc: nowIso,
    concurrencyStamp: crypto.randomUUID(),
  };

  floor.units.push(unit);
  return { structure: getProjectStructure(structures, projectId), building, floor, unit };
}

export function updateUnitInStore(
  structures: Map<string, ProjectStructureDto>,
  projectId: string,
  buildingId: string,
  floorId: string,
  unitId: string,
  request: UpdatePropertyUnitRequest,
  nowIso: string
): { structure: ProjectStructureDto; unit: PropertyUnitDto; previousNumber: string; previousType: string } {
  const current = structures.get(projectId);
  const building = current?.buildings.find((b) => b.id === buildingId);
  if (!building) {
    throw new DevPreviewStoreError(404, 'BUILDING_NOT_FOUND', 'Building not found in this project.');
  }

  const floor = building.floors.find((f) => f.id === floorId);
  if (!floor) {
    throw new DevPreviewStoreError(404, 'FLOOR_NOT_FOUND', 'Floor not found in this building.');
  }

  const unit = floor.units.find((u) => u.id === unitId);
  if (!unit) {
    throw new DevPreviewStoreError(404, 'UNIT_NOT_FOUND', 'Property unit not found on this floor.');
  }

  if (!request.expectedConcurrencyStamp || unit.concurrencyStamp !== request.expectedConcurrencyStamp) {
    throw new DevPreviewStoreError(
      409,
      'CONCURRENCY_CONFLICT',
      'This record changed after it was loaded. Reload it before saving.'
    );
  }

  if (SALES_LOCKED_UNIT_STATUSES.has(unit.status)) {
    throw new DevPreviewStoreError(
      400,
      'UNIT_DETAILS_LOCKED_BY_SALES_WORKFLOW',
      'Property unit details are locked while the unit is reserved, sold, or delivered.'
    );
  }

  const unitType = (request.unitType ?? '').trim();
  if (!(UNIT_TYPES as readonly string[]).includes(unitType)) {
    throw new DevPreviewStoreError(400, 'UNIT_TYPE_INVALID', 'A valid property unit type is required.');
  }

  const normalizedUnitNumber = (request.unitNumber ?? '').trim().toUpperCase();
  if (!normalizedUnitNumber) {
    throw new DevPreviewStoreError(400, 'UNIT_NUMBER_REQUIRED', 'Property unit number is required.');
  }
  if (normalizedUnitNumber.length > 40) {
    throw new DevPreviewStoreError(400, 'UNIT_NUMBER_TOO_LONG', 'Property unit number must not exceed 40 characters.');
  }

  if (floor.units.some((u) => u.id !== unitId && u.unitNumber.toUpperCase() === normalizedUnitNumber)) {
    throw new DevPreviewStoreError(409, 'UNIT_NUMBER_EXISTS', 'A property unit with this number already exists on the floor.');
  }

  const measurements = validateUnitMeasurements(
    request.grossAreaSquareMeters,
    request.netAreaSquareMeters,
    request.roomsCount
  );

  const previousNumber = unit.unitNumber;
  const previousType = unit.unitType;
  unit.unitNumber = normalizedUnitNumber;
  unit.unitType = unitType;
  unit.grossAreaSquareMeters = measurements.gross;
  unit.netAreaSquareMeters = measurements.net;
  unit.roomsCount = measurements.rooms;
  unit.updatedAtUtc = nowIso;
  unit.concurrencyStamp = crypto.randomUUID();

  return { structure: getProjectStructure(structures, projectId), unit, previousNumber, previousType };
}

export function changeUnitStatusInStore(
  structures: Map<string, ProjectStructureDto>,
  projectId: string,
  buildingId: string,
  floorId: string,
  unitId: string,
  request: ChangePropertyUnitStatusRequest,
  nowIso: string
): { structure: ProjectStructureDto; unit: PropertyUnitDto; previousStatus: string } {
  const current = structures.get(projectId);
  const building = current?.buildings.find((b) => b.id === buildingId);
  if (!building) {
    throw new DevPreviewStoreError(404, 'BUILDING_NOT_FOUND', 'Building not found in this project.');
  }

  const floor = building.floors.find((f) => f.id === floorId);
  if (!floor) {
    throw new DevPreviewStoreError(404, 'FLOOR_NOT_FOUND', 'Floor not found in this building.');
  }

  const unit = floor.units.find((u) => u.id === unitId);
  if (!unit) {
    throw new DevPreviewStoreError(404, 'UNIT_NOT_FOUND', 'Property unit not found on this floor.');
  }

  if (!request.expectedConcurrencyStamp || unit.concurrencyStamp !== request.expectedConcurrencyStamp) {
    throw new DevPreviewStoreError(
      409,
      'CONCURRENCY_CONFLICT',
      'This record changed after it was loaded. Reload it before saving.'
    );
  }

  const newStatus = (request.status ?? '').trim();
  if (!(ALL_UNIT_STATUSES as readonly string[]).includes(newStatus)) {
    throw new DevPreviewStoreError(400, 'UNIT_STATUS_INVALID', 'A valid property unit status is required.');
  }
  if (SALES_LOCKED_UNIT_STATUSES.has(newStatus)) {
    throw new DevPreviewStoreError(
      400,
      'UNIT_STATUS_REQUIRES_SALES_WORKFLOW',
      'Reserved, sold, and delivered states can only be assigned by the sales and contract workflow.'
    );
  }
  if (SALES_LOCKED_UNIT_STATUSES.has(unit.status)) {
    throw new DevPreviewStoreError(
      400,
      'UNIT_STATUS_LOCKED_BY_SALES_WORKFLOW',
      'The status of a reserved, sold, or delivered unit can only be changed by the sales and contract workflow.'
    );
  }

  const previousStatus = unit.status;
  if (newStatus !== unit.status) {
    const allowed = ALLOWED_UNIT_TRANSITIONS[unit.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new DevPreviewStoreError(
        400,
        'UNIT_STATUS_TRANSITION_INVALID',
        `The transition from ${unit.status} to ${newStatus} is not allowed.`
      );
    }
    unit.status = newStatus;
    unit.updatedAtUtc = nowIso;
    unit.concurrencyStamp = crypto.randomUUID();
  }

  return { structure: getProjectStructure(structures, projectId), unit, previousStatus };
}

/**
 * Generates the complete, realistic preview building/floor/unit hierarchy for
 * the disposable Vite preview demo project ("إقامة الرمال الذهبية"):
 * - 3 buildings (BLOC-A, BLOC-B, BLOC-C)
 * - 6 floors per building (0..5 => 18 floors)
 * - 4 units per floor (24 units per building => 72 units total)
 */
export function createDemoLesSablesStructure(
  projectId: string,
  nowIso: string
): ProjectStructureDto {
  const buildingConfigs = [
    {
      prefix: 'A',
      code: 'BLOC-A',
      nameAr: 'العمارة أ — الواجهة البحرية',
      nameFr: 'Bâtiment A — Front de Mer',
      status: 'UnderConstruction',
      defaultUnitStatus: 'AvailableForSale',
    },
    {
      prefix: 'B',
      code: 'BLOC-B',
      nameAr: 'العمارة ب — الحديقة الوسطى',
      nameFr: 'Bâtiment B — Jardin Central',
      status: 'UnderConstruction',
      defaultUnitStatus: 'UnderConstruction',
    },
    {
      prefix: 'C',
      code: 'BLOC-C',
      nameAr: 'العمارة ج — الكثبان الهادئة',
      nameFr: 'Bâtiment C — Les Dunes',
      status: 'Planned',
      defaultUnitStatus: 'Planned',
    },
  ] as const;

  const floorConfigs = [
    { floorNumber: 0, nameAr: 'الطابق الأرضي', nameFr: 'Rez-de-chaussée' },
    { floorNumber: 1, nameAr: 'الطابق الأول', nameFr: '1er étage' },
    { floorNumber: 2, nameAr: 'الطابق الثاني', nameFr: '2e étage' },
    { floorNumber: 3, nameAr: 'الطابق الثالث', nameFr: '3e étage' },
    { floorNumber: 4, nameAr: 'الطابق الرابع', nameFr: '4e étage' },
    { floorNumber: 5, nameAr: 'الطابق الخامس', nameFr: '5e étage' },
  ] as const;

  const structures = new Map<string, ProjectStructureDto>();

  for (const bCfg of buildingConfigs) {
    const { building } = createBuildingInStore(
      structures,
      projectId,
      {
        code: bCfg.code,
        nameAr: bCfg.nameAr,
        nameFr: bCfg.nameFr,
        status: bCfg.status,
      },
      nowIso
    );

    for (const fCfg of floorConfigs) {
      const { floor } = createFloorInStore(
        structures,
        projectId,
        building.id,
        {
          floorNumber: fCfg.floorNumber,
          nameAr: fCfg.nameAr,
          nameFr: fCfg.nameFr,
        },
        nowIso
      );

      for (let slot = 1; slot <= 4; slot++) {
        const floorTag = String(fCfg.floorNumber).padStart(2, '0');
        const unitTag = String(slot).padStart(2, '0');
        const unitNumber = `${bCfg.prefix}-${floorTag}-${unitTag}`;
        const isGroundCommercial = fCfg.floorNumber === 0 && slot <= 2;

        const unitType = isGroundCommercial
          ? (bCfg.prefix === 'C' && slot === 2 ? 'Office' : 'Shop')
          : 'Apartment';
        const grossArea = isGroundCommercial
          ? (slot === 1 ? 62.5 : 54.0)
          : (slot % 2 === 0 ? 114.5 : 92.0);
        const netArea = isGroundCommercial
          ? (slot === 1 ? 56.0 : 48.5)
          : (slot % 2 === 0 ? 99.0 : 80.5);
        const roomsCount = isGroundCommercial
          ? (unitType === 'Office' ? 2 : 1)
          : (slot % 2 === 0 ? 4 : 3);

        createUnitInStore(
          structures,
          projectId,
          building.id,
          floor.id,
          {
            unitNumber,
            unitType,
            status: bCfg.defaultUnitStatus,
            grossAreaSquareMeters: grossArea,
            netAreaSquareMeters: netArea,
            roomsCount,
          },
          nowIso
        );
      }
    }
  }

  return getProjectStructure(structures, projectId);
}
