import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ViteDevServer } from 'vite';
import {
  canUserAccessProjectStructure,
  changeUnitStatusInStore,
  computeProjectStructureCounts,
  createBuildingInStore,
  createDemoLesSablesStructure,
  createFloorInStore,
  createUnitInStore,
  DevPreviewStoreError,
  updateBuildingInStore,
  updateFloorInStore,
  updateProjectInStore,
  updateUnitInStore,
  withComputedStructureCounts,
} from './devPreviewProjectStore';
import { createPromoGestDevApiPlugin } from '../../dev-api-middleware';
import type { ProjectDto, ProjectStructureDto, UserDto } from '../types/erp';

type MiddlewareHandler = (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => void | Promise<void>;

function buildSampleProject(overrides?: Partial<ProjectDto>): ProjectDto {
  return {
    id: 'prj-1',
    code: 'DEMO-16-001',
    nameAr: 'إقامة الرمال الذهبية (معاينة)',
    nameFr: "Résidence Les Sables d'Or (démo)",
    wilayaCode: '16',
    wilayaName: 'الجزائر / Alger',
    municipality: 'عين البنيان / Aïn Benian',
    address: 'حي افتراضي',
    landTitleReference: 'TF-01',
    buildingPermitNumber: 'PC-01',
    buildingPermitDate: '2026-05-15',
    status: 'UnderConstruction',
    estimatedBudgetDzd: 850000000,
    plannedBlocksCount: 3,
    plannedUnitsCount: 72,
    actualBuildingsCount: 0,
    actualUnitsCount: 0,
    createdAtUtc: '2026-11-14T00:00:00Z',
    members: [],
    ...overrides,
  };
}

function createMiddlewareServer(): Promise<{ server: http.Server; baseUrl: string }> {
  const plugin = createPromoGestDevApiPlugin();
  const handlers: MiddlewareHandler[] = [];
  const fakeViteServer = {
    middlewares: {
      use(handler: MiddlewareHandler) {
        handlers.push(handler);
      },
    },
  } as unknown as ViteDevServer;

  if (typeof plugin.configureServer === 'function') {
    Reflect.apply(plugin.configureServer, {}, [fakeViteServer]);
  } else if (plugin.configureServer && 'handler' in plugin.configureServer) {
    Reflect.apply(plugin.configureServer.handler, {}, [fakeViteServer]);
  }

  const server = http.createServer((req, res) => {
    let idx = 0;
    const next = (err?: unknown) => {
      if (err) {
        res.statusCode = 500;
        res.end(String(err));
        return;
      }
      const handler = handlers[idx++];
      if (!handler) {
        res.statusCode = 404;
        res.end('Not handled');
        return;
      }
      Promise.resolve(handler(req, res, next)).catch((error) => {
        res.statusCode = 500;
        res.end(String(error));
      });
    };
    next();
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

class CookieJarFetch {
  private cookies = new Map<string, string>();
  public csrfToken = '';
  public bearerToken = '';

  constructor(private readonly baseUrl: string) {}

  private absorbCookies(headers: Headers) {
    const getSetCookie = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
    const rawList = typeof getSetCookie === 'function' ? getSetCookie.call(headers) : [];
    for (const entry of rawList) {
      const firstPart = entry.split(';')[0];
      const eq = firstPart.indexOf('=');
      if (eq > 0) {
        const name = firstPart.slice(0, eq).trim();
        const val = firstPart.slice(eq + 1).trim();
        if (val === '') {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, val);
        }
      }
    }
    const headerCsrf = headers.get('x-csrf-token');
    if (headerCsrf) this.csrfToken = headerCsrf;
    const previewToken = headers.get('x-promogest-preview-token');
    if (previewToken) this.bearerToken = previewToken;
  }

  async request(path: string, init?: RequestInit & { skipCsrf?: boolean }): Promise<{ status: number; json: any }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (this.cookies.size > 0) {
      headers.Cookie = [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    }
    if (this.bearerToken && !headers.Authorization) {
      headers.Authorization = `Bearer ${this.bearerToken}`;
    }
    const method = (init?.method ?? 'GET').toUpperCase();
    if (!init?.skipCsrf && (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') && this.csrfToken) {
      headers['X-CSRF-TOKEN'] = this.csrfToken;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      method,
      headers,
    });
    this.absorbCookies(res.headers);
    const text = await res.text();
    return {
      status: res.status,
      json: text ? JSON.parse(text) : null,
    };
  }
}

test('createDemoLesSablesStructure produces 3 buildings, 18 floors, and 72 valid units', () => {
  const structure = createDemoLesSablesStructure('prj-sables', '2026-11-14T10:00:00Z');
  assert.equal(structure.projectId, 'prj-sables');
  assert.equal(structure.buildings.length, 3);
  assert.deepEqual(
    structure.buildings.map((b) => b.code),
    ['BLOC-A', 'BLOC-B', 'BLOC-C']
  );

  const floorNumbersAll = new Set<number>();
  const unitNumbersAll = new Set<string>();
  let floorCount = 0;

  for (const building of structure.buildings) {
    assert.equal(building.floors.length, 6);
    floorCount += building.floors.length;
    assert.deepEqual(
      building.floors.map((f) => f.floorNumber),
      [0, 1, 2, 3, 4, 5]
    );
    for (const floor of building.floors) {
      floorNumbersAll.add(floor.floorNumber);
      assert.equal(floor.units.length, 4);
      for (const unit of floor.units) {
        assert.equal(unitNumbersAll.has(unit.unitNumber), false);
        unitNumbersAll.add(unit.unitNumber);
        assert.ok(unit.grossAreaSquareMeters !== null && unit.netAreaSquareMeters !== null);
        assert.ok(unit.netAreaSquareMeters <= unit.grossAreaSquareMeters);
        assert.ok(['Apartment', 'Shop', 'Office'].includes(unit.unitType));
        assert.ok(['Planned', 'UnderConstruction', 'AvailableForSale'].includes(unit.status));
      }
    }
  }

  assert.equal(floorCount, 18);
  assert.equal(unitNumbersAll.size, 72);

  const counts = computeProjectStructureCounts(structure);
  assert.deepEqual(counts, { actualBuildingsCount: 3, actualUnitsCount: 72 });
});

test('withComputedStructureCounts dynamically reflects structure additions independently of planned counts', () => {
  const project = buildSampleProject({ plannedBlocksCount: 5, plannedUnitsCount: 120 });
  const structures = new Map<string, ProjectStructureDto>();
  structures.set(project.id, createDemoLesSablesStructure(project.id, '2026-11-14T10:00:00Z'));

  const before = withComputedStructureCounts(project, structures);
  assert.equal(before.plannedBlocksCount, 5);
  assert.equal(before.plannedUnitsCount, 120);
  assert.equal(before.actualBuildingsCount, 3);
  assert.equal(before.actualUnitsCount, 72);

  const createdBuilding = createBuildingInStore(
    structures,
    project.id,
    { code: 'bloc-d', nameAr: 'العمارة د', nameFr: 'Bâtiment D', status: 'Planned' },
    '2026-11-14T10:05:00Z'
  );
  const createdFloor = createFloorInStore(
    structures,
    project.id,
    createdBuilding.building.id,
    { floorNumber: 0, nameAr: 'الطابق الأرضي', nameFr: 'Rez-de-chaussée' },
    '2026-11-14T10:06:00Z'
  );
  createUnitInStore(
    structures,
    project.id,
    createdBuilding.building.id,
    createdFloor.floor.id,
    {
      unitNumber: 'D-00-01',
      unitType: 'Apartment',
      status: 'Planned',
      grossAreaSquareMeters: 95,
      netAreaSquareMeters: 84,
      roomsCount: 3,
    },
    '2026-11-14T10:07:00Z'
  );

  const after = withComputedStructureCounts(project, structures);
  assert.equal(after.actualBuildingsCount, 4);
  assert.equal(after.actualUnitsCount, 73);
});

test('devPreviewProjectStore enforces uniqueness, area bounds, concurrency stamps, transitions, and permissions', () => {
  const structures = new Map<string, ProjectStructureDto>();
  const nowIso = '2026-11-14T10:00:00Z';

  const { building } = createBuildingInStore(
    structures,
    'prj-1',
    { code: 'b1', nameAr: 'عمارة 1', nameFr: 'Bloc 1', status: 'Planned' },
    nowIso
  );
  assert.equal(building.code, 'B1');

  assert.throws(
    () =>
      createBuildingInStore(
        structures,
        'prj-1',
        { code: 'B1', nameAr: 'مكرر', nameFr: 'Doublon', status: 'Planned' },
        nowIso
      ),
    (err: unknown) => err instanceof DevPreviewStoreError && err.code === 'BUILDING_CODE_EXISTS' && err.status === 409
  );

  const { floor } = createFloorInStore(
    structures,
    'prj-1',
    building.id,
    { floorNumber: 1, nameAr: 'الأول', nameFr: '1er' },
    nowIso
  );

  assert.throws(
    () =>
      createFloorInStore(
        structures,
        'prj-1',
        building.id,
        { floorNumber: 1, nameAr: 'مكرر', nameFr: 'Doublon' },
        nowIso
      ),
    (err: unknown) => err instanceof DevPreviewStoreError && err.code === 'FLOOR_NUMBER_EXISTS' && err.status === 409
  );

  assert.throws(
    () =>
      createUnitInStore(
        structures,
        'prj-1',
        building.id,
        floor.id,
        {
          unitNumber: 'U-101',
          unitType: 'Apartment',
          status: 'Planned',
          grossAreaSquareMeters: 80,
          netAreaSquareMeters: 85,
          roomsCount: 3,
        },
        nowIso
      ),
    (err: unknown) =>
      err instanceof DevPreviewStoreError && err.code === 'UNIT_NET_AREA_EXCEEDS_GROSS' && err.status === 400
  );

  const { unit } = createUnitInStore(
    structures,
    'prj-1',
    building.id,
    floor.id,
    {
      unitNumber: 'u-101',
      unitType: 'Apartment',
      status: 'Planned',
      grossAreaSquareMeters: 90,
      netAreaSquareMeters: 78,
      roomsCount: 3,
    },
    nowIso
  );

  assert.throws(
    () =>
      updateUnitInStore(
        structures,
        'prj-1',
        building.id,
        floor.id,
        unit.id,
        {
          unitNumber: 'U-101',
          unitType: 'Apartment',
          grossAreaSquareMeters: 91,
          netAreaSquareMeters: 79,
          roomsCount: 3,
          expectedConcurrencyStamp: 'stale-stamp',
        },
        nowIso
      ),
    (err: unknown) => err instanceof DevPreviewStoreError && err.code === 'CONCURRENCY_CONFLICT' && err.status === 409
  );

  assert.throws(
    () =>
      changeUnitStatusInStore(
        structures,
        'prj-1',
        building.id,
        floor.id,
        unit.id,
        { status: 'Reserved', expectedConcurrencyStamp: unit.concurrencyStamp },
        nowIso
      ),
    (err: unknown) =>
      err instanceof DevPreviewStoreError && err.code === 'UNIT_STATUS_REQUIRES_SALES_WORKFLOW' && err.status === 400
  );

  assert.throws(
    () =>
      changeUnitStatusInStore(
        structures,
        'prj-1',
        building.id,
        floor.id,
        unit.id,
        { status: 'AvailableForSale', expectedConcurrencyStamp: unit.concurrencyStamp },
        nowIso
      ),
    (err: unknown) =>
      err instanceof DevPreviewStoreError && err.code === 'UNIT_STATUS_TRANSITION_INVALID' && err.status === 400
  );

  const transitioned = changeUnitStatusInStore(
    structures,
    'prj-1',
    building.id,
    floor.id,
    unit.id,
    { status: 'UnderConstruction', expectedConcurrencyStamp: unit.concurrencyStamp },
    nowIso
  );
  assert.equal(transitioned.unit.status, 'UnderConstruction');

  const buildingUpdated = updateBuildingInStore(
    structures,
    'prj-1',
    building.id,
    {
      code: 'B1-NEW',
      nameAr: 'عمارة محدثة',
      nameFr: 'Bloc Modifié',
      status: 'UnderConstruction',
      expectedConcurrencyStamp: building.concurrencyStamp,
    },
    nowIso
  );
  assert.equal(buildingUpdated.building.code, 'B1-NEW');

  const floorUpdated = updateFloorInStore(
    structures,
    'prj-1',
    building.id,
    floor.id,
    {
      floorNumber: 2,
      nameAr: 'الثاني',
      nameFr: '2e',
      expectedConcurrencyStamp: floor.concurrencyStamp,
    },
    nowIso
  );
  assert.equal(floorUpdated.floor.floorNumber, 2);

  const project = buildSampleProject({
    members: [
      {
        id: 'm1',
        userId: 'emp-read',
        username: 'viewer',
        fullName: 'Viewer',
        roleInProject: 'ReadOnlyObserver',
        canViewFinancials: false,
        canManageSales: false,
        canManageConstruction: false,
        canManageDocuments: false,
        assignedAtUtc: nowIso,
      },
      {
        id: 'm2',
        userId: 'emp-site',
        username: 'site',
        fullName: 'Site',
        roleInProject: 'SiteSupervisor',
        canViewFinancials: false,
        canManageSales: false,
        canManageConstruction: true,
        canManageDocuments: false,
        assignedAtUtc: nowIso,
      },
    ],
  });

  assert.equal(canUserAccessProjectStructure({ id: 'emp-outsider', isSystemAdministrator: false, permissions: ['projects.read'] }, project, false), false);
  assert.equal(canUserAccessProjectStructure({ id: 'emp-read', isSystemAdministrator: false, permissions: ['projects.read'] }, project, false), true);
  assert.equal(canUserAccessProjectStructure({ id: 'emp-read', isSystemAdministrator: false, permissions: ['projects.read'] }, project, true), false);
  assert.equal(canUserAccessProjectStructure({ id: 'emp-site', isSystemAdministrator: false, permissions: ['projects.read'] }, project, true), true);

  const updatedProject = updateProjectInStore(project, {
    nameAr: 'إقامة الرمال الذهبية المحينة',
    nameFr: "Résidence Les Sables d'Or Mise à Jour",
    wilayaCode: '16',
    wilayaName: 'الجزائر / Alger',
    municipality: 'سطاوالي / Staouéli',
    address: 'عنوان جديد',
    landTitleReference: 'TF-99',
    buildingPermitNumber: 'PC-99',
    buildingPermitDate: '2026-06-01',
    status: 'Commercialization',
    estimatedBudgetDzd: 900000000,
    plannedBlocksCount: 3,
    plannedUnitsCount: 72,
  });
  assert.equal(updatedProject.code, 'DEMO-16-001');
  assert.equal(updatedProject.status, 'Commercialization');
});

test('Dev API middleware exposes Les Sables d Or with 3 buildings & 72 units and supports full HTTP structure CRUD', async () => {
  const { server, baseUrl } = await createMiddlewareServer();
  try {
    const adminClient = new CookieJarFetch(baseUrl);

    // 1. Open preview demo workspace
    const previewRes = await adminClient.request('/api/auth/preview-session');
    assert.equal(previewRes.status, 200);
    assert.ok(previewRes.json.user.permissions.includes('projects.structure.manage'));
    assert.ok(adminClient.bearerToken.length > 0);
    assert.ok(adminClient.csrfToken.length > 0);

    // 2. List projects and verify إقامة الرمال الذهبية has 3 buildings and 72 units
    const projectsRes = await adminClient.request('/api/projects');
    assert.equal(projectsRes.status, 200);
    const lesSables = (projectsRes.json as ProjectDto[]).find((p) => p.code === 'DEMO-16-001');
    assert.ok(lesSables, 'Expected DEMO-16-001 Les Sables demo project to exist');
    assert.ok(lesSables.nameAr.includes('إقامة الرمال الذهبية'));
    assert.equal(lesSables.plannedBlocksCount, 3);
    assert.equal(lesSables.plannedUnitsCount, 72);
    assert.equal(lesSables.actualBuildingsCount, 3);
    assert.equal(lesSables.actualUnitsCount, 72);

    // 3. Load structure
    const structureRes = await adminClient.request(`/api/projects/${lesSables.id}/structure`);
    assert.equal(structureRes.status, 200);
    const structure = structureRes.json as ProjectStructureDto;
    assert.equal(structure.buildings.length, 3);
    const totalUnits = structure.buildings.reduce(
      (sum, b) => sum + b.floors.reduce((fSum, f) => fSum + f.units.length, 0),
      0
    );
    assert.equal(totalUnits, 72);

    // 4. Reject state-changing request without CSRF token
    const missingCsrf = await adminClient.request(`/api/projects/${lesSables.id}/structure/buildings`, {
      method: 'POST',
      skipCsrf: true,
      body: JSON.stringify({ code: 'BLOC-D', nameAr: 'د', nameFr: 'D', status: 'Planned' }),
    });
    assert.equal(missingCsrf.status, 403);
    assert.equal(missingCsrf.json.code, 'CSRF_TOKEN_INVALID');

    // 5. Update project master data (PUT /api/projects/:id)
    const updateProjectRes = await adminClient.request(`/api/projects/${lesSables.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nameAr: lesSables.nameAr,
        nameFr: lesSables.nameFr,
        wilayaCode: lesSables.wilayaCode,
        wilayaName: lesSables.wilayaName,
        municipality: 'اسطاوالي / Staouéli',
        address: lesSables.address,
        landTitleReference: lesSables.landTitleReference,
        buildingPermitNumber: lesSables.buildingPermitNumber,
        buildingPermitDate: lesSables.buildingPermitDate,
        status: 'Commercialization',
        estimatedBudgetDzd: 920000000,
        plannedBlocksCount: 3,
        plannedUnitsCount: 72,
      }),
    });
    assert.equal(updateProjectRes.status, 200);
    assert.equal(updateProjectRes.json.municipality, 'اسطاوالي / Staouéli');
    assert.equal(updateProjectRes.json.actualBuildingsCount, 3);
    assert.equal(updateProjectRes.json.actualUnitsCount, 72);

    // 6. Create building, update building, create floor, update floor, create unit, update unit, change unit status
    const createBuildingRes = await adminClient.request(`/api/projects/${lesSables.id}/structure/buildings`, {
      method: 'POST',
      body: JSON.stringify({ code: 'BLOC-D', nameAr: 'العمارة د', nameFr: 'Bâtiment D', status: 'Planned' }),
    });
    assert.equal(createBuildingRes.status, 200);
    const createdBuilding = (createBuildingRes.json as ProjectStructureDto).buildings.find((b) => b.code === 'BLOC-D')!;
    assert.ok(createdBuilding);

    const updateBuildingRes = await adminClient.request(
      `/api/projects/${lesSables.id}/structure/buildings/${createdBuilding.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          code: 'BLOC-D',
          nameAr: 'العمارة د — محدثة',
          nameFr: 'Bâtiment D — Mis à jour',
          status: 'UnderConstruction',
          expectedConcurrencyStamp: createdBuilding.concurrencyStamp,
        }),
      }
    );
    assert.equal(updateBuildingRes.status, 200);

    const createFloorRes = await adminClient.request(
      `/api/projects/${lesSables.id}/structure/buildings/${createdBuilding.id}/floors`,
      {
        method: 'POST',
        body: JSON.stringify({ floorNumber: 0, nameAr: 'الطابق الأرضي', nameFr: 'Rez-de-chaussée' }),
      }
    );
    assert.equal(createFloorRes.status, 200);
    const createdFloor = (createFloorRes.json as ProjectStructureDto).buildings
      .find((b) => b.id === createdBuilding.id)!.floors[0];

    const updateFloorRes = await adminClient.request(
      `/api/projects/${lesSables.id}/structure/buildings/${createdBuilding.id}/floors/${createdFloor.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          floorNumber: 0,
          nameAr: 'الطابق الأرضي التجاري',
          nameFr: 'RDC Commercial',
          expectedConcurrencyStamp: createdFloor.concurrencyStamp,
        }),
      }
    );
    assert.equal(updateFloorRes.status, 200);

    const createUnitRes = await adminClient.request(
      `/api/projects/${lesSables.id}/structure/buildings/${createdBuilding.id}/floors/${createdFloor.id}/units`,
      {
        method: 'POST',
        body: JSON.stringify({
          unitNumber: 'D-00-01',
          unitType: 'Shop',
          status: 'Planned',
          grossAreaSquareMeters: 68,
          netAreaSquareMeters: 60,
          roomsCount: 1,
        }),
      }
    );
    assert.equal(createUnitRes.status, 200);
    const createdUnit = (createUnitRes.json as ProjectStructureDto).buildings
      .find((b) => b.id === createdBuilding.id)!
      .floors.find((f) => f.id === createdFloor.id)!.units[0];

    const updateUnitRes = await adminClient.request(
      `/api/projects/${lesSables.id}/structure/buildings/${createdBuilding.id}/floors/${createdFloor.id}/units/${createdUnit.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          unitNumber: 'D-00-01',
          unitType: 'Shop',
          grossAreaSquareMeters: 70,
          netAreaSquareMeters: 62,
          roomsCount: 2,
          expectedConcurrencyStamp: createdUnit.concurrencyStamp,
        }),
      }
    );
    assert.equal(updateUnitRes.status, 200);
    const updatedUnit = (updateUnitRes.json as ProjectStructureDto).buildings
      .find((b) => b.id === createdBuilding.id)!
      .floors.find((f) => f.id === createdFloor.id)!.units[0];
    assert.equal(updatedUnit.grossAreaSquareMeters, 70);

    const statusRes = await adminClient.request(
      `/api/projects/${lesSables.id}/structure/buildings/${createdBuilding.id}/floors/${createdFloor.id}/units/${updatedUnit.id}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({
          status: 'UnderConstruction',
          expectedConcurrencyStamp: updatedUnit.concurrencyStamp,
        }),
      }
    );
    assert.equal(statusRes.status, 200);
    const statusUpdatedUnit = (statusRes.json as ProjectStructureDto).buildings
      .find((b) => b.id === createdBuilding.id)!
      .floors.find((f) => f.id === createdFloor.id)!.units[0];
    assert.equal(statusUpdatedUnit.status, 'UnderConstruction');

    // 7. Verify dynamic counts reflected on GET /api/projects (3 -> 4 buildings, 72 -> 73 units)
    const projectsAfter = await adminClient.request('/api/projects');
    assert.equal(projectsAfter.status, 200);
    const lesSablesAfter = (projectsAfter.json as ProjectDto[]).find((p) => p.id === lesSables.id)!;
    assert.equal(lesSablesAfter.actualBuildingsCount, 4);
    assert.equal(lesSablesAfter.actualUnitsCount, 73);

    // 8. Create an unauthorized employee and verify structure access controls
    const createEmp = await adminClient.request('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        username: 'unassigned.emp',
        fullName: 'Unassigned Employee',
        email: 'unassigned@demo.local',
        password: 'StrongPassword2026!',
        preferredLanguage: 'ar',
        roleCodes: ['COMMERCIAL_MANAGER'],
      }),
    });
    assert.equal(createEmp.status, 201);
    const createdEmp = createEmp.json as UserDto;
    assert.equal(createdEmp.username, 'unassigned.emp');

    const empClient = new CookieJarFetch(baseUrl);
    await empClient.request('/api/auth/csrf');
    const empLogin = await empClient.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail: 'unassigned.emp', password: 'StrongPassword2026!' }),
    });
    assert.equal(empLogin.status, 200);

    const deniedRead = await empClient.request(`/api/projects/${lesSables.id}/structure`);
    assert.equal(deniedRead.status, 403);
    assert.equal(deniedRead.json.code, 'PROJECT_ACCESS_DENIED');

    const deniedWrite = await empClient.request(`/api/projects/${lesSables.id}/structure/buildings`, {
      method: 'POST',
      body: JSON.stringify({ code: 'X', nameAr: 'X', nameFr: 'X', status: 'Planned' }),
    });
    assert.equal(deniedWrite.status, 403);
    assert.equal(deniedWrite.json.code, 'FORBIDDEN_PROJECT_STRUCTURE_MANAGE');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
