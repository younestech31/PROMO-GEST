import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import test from 'node:test';
import { createPromoGestDevMiddleware } from '../../dev-api-middleware';

class TestHttpClient {
  private readonly cookies = new Map<string, string>();
  private csrfToken = '';

  constructor(private readonly baseUrl: string) {}

  private updateCookies(res: Response) {
    const setCookies =
      typeof (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
        ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
        : [];
    for (const raw of setCookies) {
      const firstPart = raw.split(';')[0];
      const eq = firstPart.indexOf('=');
      if (eq > 0) {
        const name = firstPart.slice(0, eq).trim();
        const value = firstPart.slice(eq + 1).trim();
        if (!value || raw.includes('Max-Age=0')) {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, value);
        }
      }
    }
    const csrfHeader = res.headers.get('X-CSRF-TOKEN');
    if (csrfHeader) this.csrfToken = csrfHeader;
  }

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async ensureCsrf() {
    const res = await fetch(`${this.baseUrl}/api/auth/csrf`, {
      headers: this.cookies.size ? { Cookie: this.cookieHeader() } : undefined,
    });
    assert.equal(res.status, 200);
    this.updateCookies(res);
    const data = (await res.json()) as { token: string };
    this.csrfToken = data.token;
  }

  async request(
    method: string,
    path: string,
    body?: unknown,
    isMultipart = false
  ): Promise<{ status: number; data: any; buffer: Buffer }> {
    const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
    if (isMutating && !this.csrfToken) {
      await this.ensureCsrf();
    }

    const headers: Record<string, string> = {};
    if (this.cookies.size) headers.Cookie = this.cookieHeader();
    if (isMutating) headers['X-CSRF-TOKEN'] = this.csrfToken;
    let payload: BodyInit | undefined;
    if (body !== undefined) {
      if (isMultipart) {
        payload = body as BodyInit;
      } else {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
    }

    const res = await fetch(`${this.baseUrl}${path}`, { method, headers, body: payload });
    this.updateCookies(res);
    const ab = await res.arrayBuffer();
    const buffer = Buffer.from(ab);
    const ct = res.headers.get('content-type') ?? '';
    let data: any = null;
    if (ct.includes('application/json') && buffer.length > 0) {
      data = JSON.parse(buffer.toString('utf8'));
    }
    return { status: res.status, data, buffer };
  }
}

async function withPreviewServer(run: (baseUrl: string) => Promise<void>) {
  const middleware = createPromoGestDevMiddleware();
  const server = http.createServer((req, res) => {
    void middleware(req, res, () => {
      res.statusCode = 404;
      res.end('Not Found');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
}

async function setupWithActors(baseUrl: string) {
  const adminClient = new TestHttpClient(baseUrl);
  await adminClient.ensureCsrf();
  const initRes = await adminClient.request('POST', '/api/setup/initialize', {
    legalName: 'SARL Promotion Test',
    tradeName: 'PROMO TEST',
    legalForm: 'SARL',
    wilayaCode: '16',
    wilayaName: 'الجزائر / Alger',
    address: 'Hydra, Alger',
    defaultLanguage: 'ar',
    adminUsername: 'sysadmin',
    adminFullName: 'System Admin',
    adminEmail: 'admin@test.local',
    adminPassword: 'StrongPassword#2026!',
  });
  assert.equal(initRes.status, 201);

  const loginAdmin = await adminClient.request('POST', '/api/auth/login', {
    usernameOrEmail: 'sysadmin',
    password: 'StrongPassword#2026!',
  });
  assert.equal(loginAdmin.status, 200);
  await adminClient.ensureCsrf();

  const createEmployee = async (username: string, roleCodes: string[]) => {
    const res = await adminClient.request('POST', '/api/users', {
      username,
      fullName: username,
      email: `${username}@test.local`,
      password: 'EmployeePassword#2026!',
      preferredLanguage: 'ar',
      roleCodes,
    });
    assert.equal(res.status, 201);
    const client = new TestHttpClient(baseUrl);
    await client.ensureCsrf();
    const login = await client.request('POST', '/api/auth/login', {
      usernameOrEmail: username,
      password: 'EmployeePassword#2026!',
    });
    assert.equal(login.status, 200);
    await client.ensureCsrf();
    return { user: res.data, client };
  };

  const commercial = await createEmployee('sales1', ['COMMERCIAL_MANAGER']);
  const finance = await createEmployee('finance1', ['FINANCE_OFFICER']);
  const legal = await createEmployee('legal1', ['LEGAL_OFFICER']);
  const engineer = await createEmployee('engineer1', ['SITE_ENGINEER']);
  const projectManager = await createEmployee('projectmanager1', ['PROJECT_DIRECTOR']);

  const projRes = await adminClient.request('POST', '/api/projects', {
    code: 'PRJ-01',
    nameAr: 'مشروع اختبار',
    nameFr: 'Projet Test',
    wilayaCode: '16',
    wilayaName: 'الجزائر / Alger',
    municipality: 'Hydra',
    status: 'UnderConstruction',
    estimatedBudgetDzd: 0,
    plannedBlocksCount: 1,
    plannedUnitsCount: 2,
  });
  assert.equal(projRes.status, 201);
  const projectId = projRes.data.id as string;

  // Build B1 -> Floor 1 -> Unit U-101 AvailableForSale
  const bRes = await adminClient.request('POST', `/api/projects/${projectId}/structure/buildings`, {
    code: 'B1',
    nameAr: 'عمارة 1',
    nameFr: 'Bâtiment 1',
    status: 'UnderConstruction',
  });
  assert.equal(bRes.status, 200);
  const buildingId = bRes.data.buildings[0].id as string;
  const fRes = await adminClient.request(
    'POST',
    `/api/projects/${projectId}/structure/buildings/${buildingId}/floors`,
    { floorNumber: 1, nameAr: 'ط1', nameFr: 'RDC' }
  );
  assert.equal(fRes.status, 200);
  const floorId = fRes.data.buildings[0].floors[0].id as string;
  const uRes = await adminClient.request(
    'POST',
    `/api/projects/${projectId}/structure/buildings/${buildingId}/floors/${floorId}/units`,
    { unitNumber: 'U-101', unitType: 'Apartment', status: 'AvailableForSale' }
  );
  assert.equal(uRes.status, 200);
  const unitId = uRes.data.buildings[0].floors[0].units[0].id as string;

  const assignMember = async (
    userId: string,
    roleInProject: string,
    flags: {
      canViewFinancials: boolean;
      canManageSales: boolean;
      canManageConstruction: boolean;
      canManageDocuments: boolean;
    }
  ) => {
    const res = await adminClient.request('PUT', `/api/projects/${projectId}/members`, {
      userId,
      roleInProject,
      ...flags,
    });
    assert.equal(res.status, 200);
  };

  await assignMember(commercial.user.id, 'CommercialAgent', {
    canViewFinancials: false,
    canManageSales: true,
    canManageConstruction: false,
    canManageDocuments: true,
  });
  await assignMember(finance.user.id, 'FinanceController', {
    canViewFinancials: true,
    canManageSales: false,
    canManageConstruction: false,
    canManageDocuments: false,
  });
  await assignMember(legal.user.id, 'ReadOnlyObserver', {
    canViewFinancials: false,
    canManageSales: false,
    canManageConstruction: false,
    canManageDocuments: false,
  });
  await assignMember(engineer.user.id, 'SiteSupervisor', {
    canViewFinancials: false,
    canManageSales: false,
    canManageConstruction: true,
    canManageDocuments: false,
  });
  await assignMember(projectManager.user.id, 'ProjectManager', {
    canViewFinancials: false,
    canManageSales: true,
    canManageConstruction: true,
    canManageDocuments: true,
  });

  return { adminClient, commercial, finance, legal, engineer, projectManager, projectId, unitId };
}

test('dev preview enforces parties read/manage permissions, query normalization, and party concurrency', async () => {
  await withPreviewServer(async (baseUrl) => {
    const { adminClient, commercial, finance, projectId } = await setupWithActors(baseUrl);

    // Finance officer lacks parties.directory.read
    const deniedSearch = await finance.client.request('GET', '/api/parties?query=test');
    assert.equal(deniedSearch.status, 403);
    assert.equal(deniedSearch.data.code, 'PARTY_DIRECTORY_ACCESS_DENIED');

    // Query under 2 trimmed chars rejected
    const badQuery = await commercial.client.request('GET', '/api/parties?query=%20a%20');
    assert.equal(badQuery.status, 400);
    assert.equal(badQuery.data.code, 'PARTY_SEARCH_QUERY_INVALID');

    // Create customer to materialize shared party
    const createCust = await commercial.client.request('POST', `/api/projects/${projectId}/customers`, {
      customerType: 'Individual',
      displayName: 'Karim Ziani',
      phone: '+213550001122',
      preferredLanguage: 'fr',
      source: 'WalkIn',
    });
    assert.equal(createCust.status, 201);
    const partyId = createCust.data.partyId as string;
    const stamp = createCust.data.partyConcurrencyStamp as string;

    // Commercial manager lacks parties.identity.manage
    const deniedUpdate = await commercial.client.request('PUT', `/api/parties/${partyId}`, {
      kind: 'Person',
      displayName: 'Karim Ziani Renamed',
      concurrencyStamp: stamp,
    });
    assert.equal(deniedUpdate.status, 403);
    assert.equal(deniedUpdate.data.code, 'PARTY_IDENTITY_MANAGE_REQUIRED');

    // SysAdmin updates with stale stamp -> 409; valid stamp -> 200 and propagates
    const staleUpdate = await adminClient.request('PUT', `/api/parties/${partyId}`, {
      kind: 'Person',
      displayName: 'Karim Ziani Updated',
      concurrencyStamp: 'wrong-stamp',
    });
    assert.equal(staleUpdate.status, 409);
    assert.equal(staleUpdate.data.code, 'PARTY_CONCURRENCY_CONFLICT');

    const okUpdate = await adminClient.request('PUT', `/api/parties/${partyId}`, {
      kind: 'Person',
      displayName: 'Karim Ziani Updated',
      concurrencyStamp: stamp,
    });
    assert.equal(okUpdate.status, 200);

    const searchAfter = await commercial.client.request('GET', '/api/parties?query=Updated');
    assert.equal(searchAfter.status, 200);
    assert.equal(searchAfter.data.length, 1);

    const audits = await adminClient.request('GET', '/api/audit?limit=50');
    assert.ok(audits.data.some((a: any) => a.eventType === 'ACCESS_DENIED'));
    assert.ok(audits.data.some((a: any) => a.eventType === 'PARTY_IDENTITY_UPDATED'));
  });
});

test('dev preview enforces document upload integrity, category scoping, and KYC document isolation across users', async () => {
  await withPreviewServer(async (baseUrl) => {
    const { adminClient, commercial, finance, projectManager, projectId } = await setupWithActors(baseUrl);

    const makeMultipart = (filename: string, content: Buffer, category: string, description = '') => {
      const form = new FormData();
      form.append('file', new Blob([new Uint8Array(content)], { type: 'application/octet-stream' }), filename);
      form.append('category', category);
      if (description) form.append('description', description);
      return form;
    };

    // Disallowed extension blocked
    const badExt = await commercial.client.request(
      'POST',
      `/api/projects/${projectId}/documents`,
      makeMultipart('malware.exe', Buffer.from('MZ'), 'Permits'),
      true
    );
    assert.equal(badExt.status, 400);
    assert.equal(badExt.data.code, 'DOCUMENT_EXTENSION_NOT_ALLOWED');

    // Commercial without CanViewFinancials cannot upload Financial category
    const forbiddenCat = await commercial.client.request(
      'POST',
      `/api/projects/${projectId}/documents`,
      makeMultipart('budget.pdf', Buffer.from('%PDF-1.4\nfinance'), 'Financial'),
      true
    );
    assert.equal(forbiddenCat.status, 403);
    assert.equal(forbiddenCat.data.code, 'PROJECT_DOCUMENT_CATEGORY_FORBIDDEN');

    // SysAdmin uploads Financial document -> Commercial cannot see/download, Finance can
    const finPayload = Buffer.from('%PDF-1.4\nbudget-secret');
    const finUpload = await adminClient.request(
      'POST',
      `/api/projects/${projectId}/documents`,
      makeMultipart('budget.pdf', finPayload, 'Financial', 'Confidential budget'),
      true
    );
    assert.equal(finUpload.status, 201);
    assert.equal(
      finUpload.data.sha256Checksum,
      crypto.createHash('sha256').update(finPayload).digest('hex')
    );

    const finDownloadOk = await finance.client.request(
      'GET',
      `/api/projects/${projectId}/documents/${finUpload.data.id}/download`
    );
    assert.equal(finDownloadOk.status, 200);
    assert.deepEqual(finDownloadOk.buffer, finPayload);

    const commDownloadFin = await commercial.client.request(
      'GET',
      `/api/projects/${projectId}/documents/${finUpload.data.id}/download`
    );
    assert.equal(commDownloadFin.status, 403);
    assert.equal(commDownloadFin.data.code, 'PROJECT_DOCUMENT_ACCESS_DENIED');

    // ProjectManager membership does not bypass the explicit Financial read capability.
    const managerDocsDenied = await projectManager.client.request('GET', `/api/projects/${projectId}/documents`);
    assert.equal(managerDocsDenied.status, 200);
    assert.equal(managerDocsDenied.data.some((d: any) => d.id === finUpload.data.id), false);
    const managerDownloadDenied = await projectManager.client.request(
      'GET',
      `/api/projects/${projectId}/documents/${finUpload.data.id}/download`
    );
    assert.equal(managerDownloadDenied.status, 403);
    assert.equal(managerDownloadDenied.data.code, 'PROJECT_DOCUMENT_ACCESS_DENIED');

    // Keep the existing ProjectManager upload capability unchanged by this read-only fix.
    const managerFinancialUpload = await projectManager.client.request(
      'POST',
      `/api/projects/${projectId}/documents`,
      makeMultipart('manager-budget.txt', Buffer.from('manager upload'), 'Financial'),
      true
    );
    assert.equal(managerFinancialUpload.status, 201);

    const denialAudit = await adminClient.request('GET', '/api/audit?limit=100');
    assert.ok(denialAudit.data.some((entry: any) =>
      entry.eventType === 'ACCESS_DENIED' && entry.actorUserId === projectManager.user.id
    ));

    const grantManagerFinancials = await adminClient.request(
      'PUT',
      `/api/projects/${projectId}/members`,
      {
        userId: projectManager.user.id,
        roleInProject: 'ProjectManager',
        canViewFinancials: true,
        canManageSales: true,
        canManageConstruction: true,
        canManageDocuments: true,
      }
    );
    assert.equal(grantManagerFinancials.status, 200);
    const managerDocsAllowed = await projectManager.client.request('GET', `/api/projects/${projectId}/documents`);
    assert.equal(managerDocsAllowed.status, 200);
    assert.equal(managerDocsAllowed.data.some((d: any) => d.id === finUpload.data.id), true);
    const managerDownloadAllowed = await projectManager.client.request(
      'GET',
      `/api/projects/${projectId}/documents/${finUpload.data.id}/download`
    );
    assert.equal(managerDownloadAllowed.status, 200);
    assert.deepEqual(managerDownloadAllowed.buffer, finPayload);

    // Commercial uploads Legal KYC scan (Legal requires canManageDocuments=true) and attaches to customer
    const kycBytes = Buffer.from('CNI-SCAN-BYTES-12345');
    const kycUpload = await commercial.client.request(
      'POST',
      `/api/projects/${projectId}/documents`,
      makeMultipart('cni-amina.png', kycBytes, 'Legal', 'KYC'),
      true
    );
    assert.equal(kycUpload.status, 201);

    const custWithKyc = await commercial.client.request('POST', `/api/projects/${projectId}/customers`, {
      customerType: 'Individual',
      displayName: 'Amina Benali',
      phone: '+213551223344',
      preferredLanguage: 'ar',
      source: 'WalkIn',
      identityDocumentStoredFileId: kycUpload.data.id,
    });
    assert.equal(custWithKyc.status, 201);
    assert.equal(custWithKyc.data.identityDocument.id, kycUpload.data.id);

    // Finance has files.read and canViewFinancials, but NO customers.read -> KYC doc must be hidden in list & blocked on download!
    const financeDocsList = await finance.client.request('GET', `/api/projects/${projectId}/documents`);
    assert.equal(financeDocsList.status, 200);
    assert.equal(
      financeDocsList.data.some((d: any) => d.id === kycUpload.data.id),
      false,
      'KYC customer identity document leaked to member without customers.read'
    );

    const financeDownloadKyc = await finance.client.request(
      'GET',
      `/api/projects/${projectId}/documents/${kycUpload.data.id}/download`
    );
    assert.equal(financeDownloadKyc.status, 403);
    assert.equal(financeDownloadKyc.data.code, 'PROJECT_DOCUMENT_ACCESS_DENIED');
  });
});

test('dev preview enforces customer/reservation scopes, dual concurrency, and cancellation guards', async () => {
  await withPreviewServer(async (baseUrl) => {
    const { adminClient, commercial, legal, engineer, projectId, unitId } = await setupWithActors(baseUrl);

    // Engineer lacks reservation read
    const engResList = await engineer.client.request('GET', `/api/projects/${projectId}/reservations`);
    assert.equal(engResList.status, 403);
    assert.equal(engResList.data.code, 'PROJECT_RESERVATION_ACCESS_DENIED');

    // Legal can read customers, cannot write customers
    const legalCustPost = await legal.client.request('POST', `/api/projects/${projectId}/customers`, {
      customerType: 'Individual',
      displayName: 'Blocked Lead',
      phone: '+213559998877',
      preferredLanguage: 'fr',
      source: 'Phone',
    });
    assert.equal(legalCustPost.status, 403);
    assert.equal(legalCustPost.data.code, 'FORBIDDEN_PROJECT_CUSTOMER_WRITE');

    // Commercial creates customer and reservation
    const custRes = await commercial.client.request('POST', `/api/projects/${projectId}/customers`, {
      customerType: 'Individual',
      displayName: 'Nabil Mansour',
      phone: '+213552334455',
      preferredLanguage: 'fr',
      source: 'Phone',
    });
    assert.equal(custRes.status, 201);

    // Customer update requires dual concurrency stamps
    const badPartyStampPut = await commercial.client.request(
      'PUT',
      `/api/projects/${projectId}/customers/${custRes.data.id}`,
      {
        customerType: 'Individual',
        displayName: 'Nabil Mansour',
        phone: '+213552334499',
        preferredLanguage: 'fr',
        source: 'Phone',
        status: 'Qualified',
        concurrencyStamp: custRes.data.concurrencyStamp,
        partyConcurrencyStamp: 'stale-party-stamp',
      }
    );
    assert.equal(badPartyStampPut.status, 409);
    assert.equal(badPartyStampPut.data.code, 'PARTY_CONCURRENCY_CONFLICT');

    // Past reservation expiry rejected
    const pastRes = await commercial.client.request('POST', `/api/projects/${projectId}/reservations`, {
      propertyUnitId: unitId,
      projectCustomerId: custRes.data.id,
      expiresAtUtc: new Date(Date.now() - 60_000).toISOString(),
    });
    assert.equal(pastRes.status, 400);
    assert.equal(pastRes.data.code, 'RESERVATION_EXPIRY_INVALID');

    // Valid reservation succeeds & marks unit Reserved
    const okRes = await commercial.client.request('POST', `/api/projects/${projectId}/reservations`, {
      propertyUnitId: unitId,
      projectCustomerId: custRes.data.id,
      expiresAtUtc: new Date(Date.now() + 86_400_000).toISOString(),
    });
    assert.equal(okRes.status, 201);

    // Second reservation on already reserved unit fails with 409
    const dupRes = await commercial.client.request('POST', `/api/projects/${projectId}/reservations`, {
      propertyUnitId: unitId,
      projectCustomerId: custRes.data.id,
      expiresAtUtc: new Date(Date.now() + 86_400_000).toISOString(),
    });
    assert.equal(dupRes.status, 409);
    assert.equal(dupRes.data.code, 'RESERVATION_UNIT_UNAVAILABLE');

    // Cancel requires reason
    const noReasonCancel = await commercial.client.request(
      'POST',
      `/api/projects/${projectId}/reservations/${okRes.data.id}/cancel`,
      { reason: '   ', expectedConcurrencyStamp: okRes.data.concurrencyStamp }
    );
    assert.equal(noReasonCancel.status, 400);
    assert.equal(noReasonCancel.data.code, 'RESERVATION_CANCEL_REASON_REQUIRED');

    // Valid cancel restores unit AvailableForSale
    const okCancel = await commercial.client.request(
      'POST',
      `/api/projects/${projectId}/reservations/${okRes.data.id}/cancel`,
      { reason: 'Client withdrew', expectedConcurrencyStamp: okRes.data.concurrencyStamp }
    );
    assert.equal(okCancel.status, 200);
    assert.equal(okCancel.data.status, 'Cancelled');

    const structAfter = await adminClient.request('GET', `/api/projects/${projectId}/structure`);
    assert.equal(structAfter.data.buildings[0].floors[0].units[0].status, 'AvailableForSale');
  });
});

test('dev preview exposes canonical organization permissions without broadening non-admin grants', async () => {
  await withPreviewServer(async (baseUrl) => {
    const { adminClient, commercial } = await setupWithActors(baseUrl);

    const adminSession = await adminClient.request('GET', '/api/auth/me');
    const commercialSession = await commercial.client.request('GET', '/api/auth/me');

    assert.equal(adminSession.status, 200);
    assert.equal(commercialSession.status, 200);
    assert.ok(adminSession.data.user.permissions.includes('org.read'));
    assert.ok(adminSession.data.user.permissions.includes('org.manage'));
    assert.ok(commercialSession.data.user.permissions.includes('org.read'));
    assert.equal(commercialSession.data.user.permissions.includes('org.manage'), false);
    assert.equal(commercialSession.data.user.permissions.includes('organization.manage'), false);
  });
});
