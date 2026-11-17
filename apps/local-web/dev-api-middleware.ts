/**
 * DEVELOPMENT-ONLY Vite Middleware for AI Studio / Frontend Preview.
 *
 * IMPORTANT ARCHITECTURAL NOTE:
 * - This middleware runs ONLY inside the Vite dev server when `ASPNETCORE_URL` is NOT set.
 * - It is NEVER bundled into `dist/` and NEVER used in production.
 * - Production builds (`vite build`) emit static assets served by ASP.NET Core 10 (`PromoGest.Api`),
 *   which executes all real business logic against PostgreSQL 18.
 */
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';
import type {
  AuditLogDto,
  ChangePropertyUnitStatusRequest,
  CreateBuildingFloorRequest,
  CreateBuildingRequest,
  CreatePropertyUnitRequest,
  InitializeInstallationRequest,
  OrganizationSummary,
  PartyDirectoryItemDto,
  ProjectCustomerDto,
  ProjectDto,
  ProjectDocumentDto,
  ProjectSalesReservationDto,
  ProjectStructureDto,
  RoleDto,
  UpdateBuildingFloorRequest,
  UpdateBuildingRequest,
  UpdateProjectRequest,
  UpdatePropertyUnitRequest,
  UserDto,
} from './src/types/erp';
import { getDevPreviewCookieAttributes } from './src/utils/devPreviewCookies';
import { DEV_PREVIEW_ADMINISTRATIVE_REFERENCE } from './src/utils/administrativeReferencePreview';
import {
  canUserAccessProjectStructure,
  canUserViewProjectFinancials,
  changeUnitStatusInStore,
  computeProjectStructureCounts,
  createBuildingInStore,
  createDemoLesSablesStructure,
  createFloorInStore,
  createUnitInStore,
  DevPreviewStoreError,
  getProjectStructure,
  updateBuildingInStore,
  updateFloorInStore,
  updateProjectInStore,
  updateUnitInStore,
  withComputedStructureCounts,
  withProjectFinancialVisibility,
} from './src/utils/devPreviewProjectStore';

interface StoredUserRecord extends UserDto {
  passwordHash: string;
  securityStamp: string;
}

interface StoredSession {
  tokenHash: string;
  userId: string;
  securityStamp: string;
  expiresAtMs: number;
}

const COOKIE_NAME = 'promogest_session';
const CSRF_COOKIE_NAME = 'promogest_csrf';
const ANTIFORGERY_COOKIE_NAME = '.PromoGest.Antiforgery';
const CSRF_HEADER_NAME = 'X-CSRF-TOKEN';

const SEEDED_ROLES: RoleDto[] = [
  {
    id: '20000000-0000-0000-0000-000000000001',
    code: 'SYSTEM_ADMIN',
    nameAr: 'مدير النظام',
    nameFr: 'Administrateur Système',
    descriptionAr: 'الصلاحية الكاملة الوحيدة لإدارة النظام المحلي',
    descriptionFr: 'Compte unique d\'administration locale du système',
    isSystemRole: true,
  },
  {
    id: '20000000-0000-0000-0000-000000000002',
    code: 'PROJECT_DIRECTOR',
    nameAr: 'مدير المشاريع',
    nameFr: 'Directeur de Projets',
    descriptionAr: 'إدارة المشاريع العقارية وتعيين فرق العمل',
    descriptionFr: 'Pilotage des projets immobiliers et affectation des équipes',
    isSystemRole: false,
  },
  {
    id: '20000000-0000-0000-0000-000000000003',
    code: 'COMMERCIAL_MANAGER',
    nameAr: 'مسؤول المبيعات والتسويق',
    nameFr: 'Responsable Commercial',
    descriptionAr: 'متابعة الزبائن والمبيعات والحجوزات ضمن المشاريع المصرح بها',
    descriptionFr: 'Suivi des clients, ventes et réservations sur les projets autorisés',
    isSystemRole: false,
  },
  {
    id: '20000000-0000-0000-0000-000000000004',
    code: 'FINANCE_OFFICER',
    nameAr: 'مسؤول المالية والمحاسبة',
    nameFr: 'Responsable Financier',
    descriptionAr: 'متابعة الدفعات والمستحقات المالية للمشاريع المصرح بها',
    descriptionFr: 'Suivi des encaissements et échéanciers des projets autorisés',
    isSystemRole: false,
  },
  {
    id: '20000000-0000-0000-0000-000000000005',
    code: 'SITE_ENGINEER',
    nameAr: 'مهندس متابعة الأشغال',
    nameFr: 'Ingénieur Travaux',
    descriptionAr: 'تحديث تقدم الأشغال والوثائق التقنية للمشاريع المصرح بها',
    descriptionFr: 'Suivi de l\'avancement des travaux et dossiers techniques',
    isSystemRole: false,
  },
  {
    id: '20000000-0000-0000-0000-000000000006',
    code: 'LEGAL_OFFICER',
    nameAr: 'المكلف بالشؤون القانونية والعقود',
    nameFr: 'Chargé Juridique & Contrats',
    descriptionAr: 'إعداد ومراجعة العقود والوثائق العقارية',
    descriptionFr: 'Préparation et vérification des actes et contrats immobiliers',
    isSystemRole: false,
  },
  {
    id: '20000000-0000-0000-0000-000000000007',
    code: 'VIEWER',
    nameAr: 'مستخدم للمطالعة فقط',
    nameFr: 'Consultant Lecture Seule',
    descriptionAr: 'الاطلاع فقط على المشاريع المصرح بها',
    descriptionFr: 'Consultation en lecture seule des projets autorisés',
    isSystemRole: false,
  },
];

const ROLE_PERMS: Record<string, string[]> = {
  SYSTEM_ADMIN: [
    'org.read', 'org.manage', 'users.read', 'users.manage',
    'projects.read', 'projects.create', 'projects.manage', 'projects.access.manage',
    'projects.structure.manage', 'audit.read', 'files.read', 'files.write',
    'parties.directory.read', 'parties.identity.manage',
    'customers.read', 'customers.manage',
    'sales.reservations.read', 'sales.reservations.manage',
  ],
  PROJECT_DIRECTOR: [
    'org.read', 'projects.read', 'projects.create', 'projects.manage',
    'projects.access.manage', 'projects.structure.manage', 'files.read', 'files.write',
    'parties.directory.read', 'customers.read', 'customers.manage',
    'sales.reservations.read', 'sales.reservations.manage',
  ],
  COMMERCIAL_MANAGER: [
    'org.read', 'projects.read', 'files.read', 'files.write',
    'parties.directory.read', 'customers.read', 'customers.manage',
    'sales.reservations.read', 'sales.reservations.manage',
  ],
  FINANCE_OFFICER: ['org.read', 'projects.read', 'files.read', 'files.write'],
  SITE_ENGINEER: ['org.read', 'projects.read', 'projects.structure.manage', 'files.read', 'files.write'],
  LEGAL_OFFICER: ['org.read', 'projects.read', 'files.read', 'files.write', 'customers.read'],
  VIEWER: ['org.read', 'projects.read'],
};

const PASSWORD_MAX_LENGTH = 128;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha512');
  return `${salt.toString('base64')}:${derived.toString('base64')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;
  const derived = crypto.pbkdf2Sync(password, Buffer.from(saltB64, 'base64'), 100_000, 32, 'sha512');
  const expected = Buffer.from(hashB64, 'base64');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const idx = part.indexOf('=');
      if (idx < 0) return [part.trim(), ''];
      return [part.slice(0, idx).trim(), decodeURIComponent(part.slice(idx + 1).trim())];
    })
  );
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return (raw ? JSON.parse(raw) : {}) as T;
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  extraHeaders?: Record<string, string | string[]>
) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      res.setHeader(k, v);
    }
  }
  res.end(JSON.stringify(body));
}

interface ParsedMultipartFile {
  fieldName: string;
  fileName: string;
  contentType: string;
  content: Buffer;
}

interface ParsedMultipartBody {
  fields: Record<string, string>;
  files: Record<string, ParsedMultipartFile>;
}

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const ALLOWED_DOCUMENT_CATEGORIES = new Set([
  'Permits',
  'Plans',
  'Legal',
  'LandAndTitle',
  'Financial',
  'Engineering',
  'Commercial',
  'Correspondence',
  'Other',
]);
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
]);

async function readRawBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      throw new DevPreviewStoreError(400, 'DOCUMENT_TOO_LARGE', 'File exceeds the maximum allowed size of 25 MB.');
    }
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

function parseMultipartFormData(body: Buffer, contentTypeHeader: string | undefined): ParsedMultipartBody | null {
  if (!contentTypeHeader) return null;
  const boundaryMatch = contentTypeHeader.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  if (!boundary) return null;

  const boundaryBuf = Buffer.from(`--${boundary}`, 'latin1');
  const headerSepBuf = Buffer.from('\r\n\r\n', 'latin1');
  const fields: Record<string, string> = {};
  const files: Record<string, ParsedMultipartFile> = {};

  let offset = body.indexOf(boundaryBuf);
  while (offset >= 0) {
    const afterBoundary = offset + boundaryBuf.length;
    if (body[afterBoundary] === 0x2d && body[afterBoundary + 1] === 0x2d) {
      break;
    }
    const partStart =
      body[afterBoundary] === 0x0d && body[afterBoundary + 1] === 0x0a
        ? afterBoundary + 2
        : afterBoundary;
    const nextBoundary = body.indexOf(boundaryBuf, partStart);
    if (nextBoundary < 0) break;

    let partEnd = nextBoundary;
    if (partEnd >= partStart + 2 && body[partEnd - 2] === 0x0d && body[partEnd - 1] === 0x0a) {
      partEnd -= 2;
    }

    const headerSep = body.indexOf(headerSepBuf, partStart);
    if (headerSep >= 0 && headerSep < partEnd) {
      const headersText = body.subarray(partStart, headerSep).toString('utf8');
      const payload = body.subarray(headerSep + 4, partEnd);
      const dispMatch = headersText.match(
        /content-disposition:\s*[^\r\n]*\bname="([^"]+)"(?:;\s*filename="([^"]*)")?/i
      );
      if (dispMatch) {
        const fieldName = dispMatch[1];
        const fileName = dispMatch[2];
        if (fileName !== undefined) {
          const typeMatch = headersText.match(/content-type:\s*([^\r\n]+)/i);
          files[fieldName] = {
            fieldName,
            fileName: fileName.replace(/^.*[\\/]/, ''),
            contentType: typeMatch?.[1]?.trim() || 'application/octet-stream',
            content: Buffer.from(payload),
          };
        } else {
          fields[fieldName] = payload.toString('utf8');
        }
      }
    }
    offset = nextBoundary;
  }

  return { fields, files };
}

export function createPromoGestDevMiddleware(): (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) => Promise<void> {
  let organization: OrganizationSummary | null = null;
  const users: StoredUserRecord[] = [];
  const sessions: StoredSession[] = [];
  const projects: ProjectDto[] = [];
  const projectStructures = new Map<string, ProjectStructureDto>();
  const parties: PartyDirectoryItemDto[] = [];
  const projectCustomers = new Map<string, ProjectCustomerDto[]>();
  const projectReservations = new Map<string, ProjectSalesReservationDto[]>();
  const projectDocuments = new Map<string, Array<{ meta: ProjectDocumentDto; content: Buffer }>>();
  const auditLogs: AuditLogDto[] = [];
  const csrfSecret = crypto.randomBytes(32);

  function signCsrfToken(sessionKey: string, nonce: string): string {
    return crypto.createHmac('sha256', csrfSecret).update(`${sessionKey}:${nonce}`).digest('base64url');
  }

  function getCookieAttributes(req: IncomingMessage): string {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const socketEncrypted = Boolean((req.socket as unknown as { encrypted?: boolean }).encrypted);
    return getDevPreviewCookieAttributes(forwardedProto, socketEncrypted);
  }

  function createCsrfPair(sessionKey: string, cookieAttributes: string): { token: string; cookies: string[] } {
    const nonce = crypto.randomBytes(16).toString('base64url');
    const token = `${nonce}.${signCsrfToken(sessionKey, nonce)}`;
    return {
      token,
      cookies: [
        `${ANTIFORGERY_COOKIE_NAME}=${nonce}; ${cookieAttributes}; HttpOnly`,
        `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttributes}`,
      ],
    };
  }

  function validateCsrfRequest(req: IncomingMessage, sessionKey: string): boolean {
    const cookies = parseCookies(req);
    const cookieNonce = cookies[ANTIFORGERY_COOKIE_NAME];
    const headerVal = req.headers['x-csrf-token'];
    const token = Array.isArray(headerVal) ? headerVal[0] : headerVal;
    if (!cookieNonce || !token) return false;
    const dotIdx = token.indexOf('.');
    if (dotIdx <= 0) return false;
    const tokenNonce = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    if (tokenNonce !== cookieNonce) return false;
    const expectedSig = signCsrfToken(sessionKey, tokenNonce);
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  }

  function addAudit(
    eventType: string,
    severity: 'Info' | 'Warning' | 'Security',
    summary: string,
    actor?: StoredUserRecord | null,
    targetType?: string,
    targetId?: string
  ) {
    auditLogs.unshift({
      id: crypto.randomUUID(),
      occurredAtUtc: new Date().toISOString(),
      actorUserId: actor?.id ?? null,
      actorUsername: actor?.username ?? null,
      eventType,
      severity,
      targetEntityType: targetType ?? null,
      targetEntityId: targetId ?? null,
      summary: summary.slice(0, 500),
      ipAddress: '127.0.0.1',
    });
  }

  function getPermissions(user: StoredUserRecord): string[] {
    const set = new Set<string>();
    for (const r of user.roleCodes) {
      for (const p of ROLE_PERMS[r] ?? []) {
        set.add(p);
      }
    }
    return [...set].sort();
  }

  function toProjectResponse(project: ProjectDto, actor: StoredUserRecord): ProjectDto {
    if (canUserViewProjectFinancials(actor, project)) {
      addAudit(
        'PROJECT_FINANCIALS_VIEWED',
        'Info',
        `Viewed estimated budget for project '${project.code}'.`,
        actor,
        'Project',
        project.id
      );
    }

    return withProjectFinancialVisibility(
      withComputedStructureCounts(project, projectStructures),
      actor
    );
  }

  function toPublicUser(u: StoredUserRecord): UserDto {
    const { passwordHash: _ph, securityStamp: _ss, ...rest } = u;
    return rest;
  }

  function getAuthenticatedSession(req: IncomingMessage): { user: StoredUserRecord; sessionHash: string } | null {
    const cookies = parseCookies(req);
    const authorization = req.headers.authorization;
    const authorizationValue = Array.isArray(authorization) ? authorization[0] : authorization;
    const bearerToken = authorizationValue?.match(/^Bearer ([A-Za-z0-9_-]+)$/)?.[1] ?? null;
    // Embedded preview browsers may reject third-party cookies. The Vite-only
    // demo entry route therefore also issues a short-lived bearer token held in
    // the frontend module's memory; this middleware is never used in production.
    const raw = bearerToken ?? cookies[COOKIE_NAME];
    if (!raw) return null;
    const hashed = hashToken(raw);
    const session = sessions.find((s) => s.tokenHash === hashed && s.expiresAtMs > Date.now());
    if (!session) return null;
    const user = users.find((u) => u.id === session.userId);
    if (!user || !user.isActive || user.securityStamp !== session.securityStamp) return null;
    return { user, sessionHash: hashed };
  }


  /**
   * Creates disposable sample data for the Vite-only preview.
   * This is deliberately lazy: the real first-run wizard remains available until
   * the user explicitly opens the demo workspace.
   */
  function ensurePreviewDemoData(): StoredUserRecord | null {
    if (organization) {
      // Never turn an already initialized, user-provided Vite organization into a demo admin session.
      if (organization.id !== '30000000-0000-0000-0000-000000000001') return null;
      return users.find((user) => user.id === '30000000-0000-0000-0000-000000000002') ?? null;
    }

    const nowIso = new Date().toISOString();
    organization = {
      id: '30000000-0000-0000-0000-000000000001',
      legalName: 'مؤسسة تجريبية لمعاينة PROMO GEST',
      tradeName: 'PROMO GEST DEMO',
      legalForm: 'SARL',
      nif: null,
      nis: null,
      tradeRegisterNumber: null,
      taxArticleNumber: null,
      shareCapitalDzd: null,
      wilayaCode: '31',
      wilayaName: 'وهران / Oran',
      address: 'عنوان افتراضي غير حقيقي — بيانات معاينة فقط',
      phone: null,
      email: 'demo@promogest.local',
      defaultLanguage: 'ar',
      currencyCode: 'DZD',
    };

    const admin: StoredUserRecord = {
      id: '30000000-0000-0000-0000-000000000002',
      username: 'demo.admin',
      fullName: 'مدير المعاينة التجريبية',
      email: 'demo@promogest.local',
      phone: null,
      isSystemAdministrator: true,
      isActive: true,
      preferredLanguage: 'ar',
      failedLoginAttempts: 0,
      lockoutEndUtc: null,
      lastLoginAtUtc: null,
      createdAtUtc: nowIso,
      roleCodes: ['SYSTEM_ADMIN'],
      // The preview session is issued by a dedicated development-only GET route;
      // no reusable demo password is created or exposed.
      passwordHash: hashPassword(crypto.randomBytes(32).toString('hex')),
      securityStamp: crypto.randomUUID(),
    };
    users.push(admin);

    const lesSablesId = '30000000-0000-0000-0000-000000000003';
    const lesSablesStructure = createDemoLesSablesStructure(lesSablesId, nowIso);
    projectStructures.set(lesSablesId, lesSablesStructure);
    const lesSablesCounts = computeProjectStructureCounts(lesSablesStructure);

    projects.push(
      {
        id: lesSablesId,
        code: 'DEMO-16-001',
        nameAr: 'إقامة الرمال الذهبية (معاينة)',
        nameFr: "Résidence Les Sables d'Or (démo)",
        wilayaCode: '16',
        wilayaName: 'الجزائر / Alger',
        municipality: 'عين البنيان / Aïn Benian',
        address: 'حي افتراضي غير حقيقي — بيانات معاينة فقط',
        landTitleReference: 'DEMO-LAND-001',
        buildingPermitNumber: 'DEMO-PERMIT-001',
        buildingPermitDate: '2026-05-15',
        status: 'UnderConstruction',
        estimatedBudgetDzd: 850000000,
        plannedBlocksCount: lesSablesCounts.actualBuildingsCount,
        plannedUnitsCount: lesSablesCounts.actualUnitsCount,
        actualBuildingsCount: lesSablesCounts.actualBuildingsCount,
        actualUnitsCount: lesSablesCounts.actualUnitsCount,
        createdAtUtc: nowIso,
        concurrencyStamp: crypto.randomUUID(),
        members: [],
      },
      {
        id: '30000000-0000-0000-0000-000000000004',
        code: 'DEMO-ORAN-002',
        nameAr: 'إقامة الباهية التجريبية',
        nameFr: 'Résidence El Bahia (démo)',
        wilayaCode: '31',
        wilayaName: 'وهران / Oran',
        municipality: 'السانية / Es Sénia',
        address: 'عنوان افتراضي — وهران',
        landTitleReference: 'DEMO-LAND-002',
        buildingPermitNumber: 'DEMO-PERMIT-002',
        buildingPermitDate: null,
        status: 'Planning',
        estimatedBudgetDzd: 780000000,
        plannedBlocksCount: 2,
        plannedUnitsCount: 96,
        actualBuildingsCount: 0,
        actualUnitsCount: 0,
        createdAtUtc: nowIso,
        concurrencyStamp: crypto.randomUUID(),
        members: [],
      }
    );

    const demoParty1: PartyDirectoryItemDto = {
      id: '30000000-0000-0000-0000-000000000101',
      kind: 'Person',
      displayName: 'أمينة بن عيسى / Amina Benaïssa',
      concurrencyStamp: crypto.randomUUID(),
    };
    const demoParty2: PartyDirectoryItemDto = {
      id: '30000000-0000-0000-0000-000000000102',
      kind: 'LegalEntity',
      displayName: 'شركة الأطلس للخدمات ش.ذ.م.م / SARL Atlas Services',
      concurrencyStamp: crypto.randomUUID(),
    };
    parties.push(demoParty1, demoParty2);

    const demoCustomer1Id = '30000000-0000-0000-0000-000000000201';
    const demoCustomer2Id = '30000000-0000-0000-0000-000000000202';
    projectCustomers.set(lesSablesId, [
      {
        id: demoCustomer1Id,
        partyId: demoParty1.id,
        partyConcurrencyStamp: demoParty1.concurrencyStamp,
        projectId: lesSablesId,
        customerType: 'Individual',
        displayName: demoParty1.displayName,
        contactPerson: null,
        phone: '+213 550 11 22 33',
        email: 'amina.demo@promogest.local',
        address: 'حيدرة، الجزائر / Hydra, Alger',
        preferredLanguage: 'ar',
        source: 'WalkIn',
        status: 'Qualified',
        identityDocument: null,
        interactions: [
          {
            id: '30000000-0000-0000-0000-000000000301',
            type: 'Visit',
            subject: 'زيارة ميدانية لشقة F3 / Visite F3 Bloc A',
            summary: 'معاينة الطابق الأول والاطلاع على المخطط الهندسي (بيانات تجريبية).',
            occurredAtUtc: nowIso,
            nextFollowUpAtUtc: new Date(Date.now() + 3 * 86400_000).toISOString(),
            createdByFullName: admin.fullName,
          },
        ],
        createdAtUtc: nowIso,
        updatedAtUtc: nowIso,
        concurrencyStamp: crypto.randomUUID(),
      },
      {
        id: demoCustomer2Id,
        partyId: demoParty2.id,
        partyConcurrencyStamp: demoParty2.concurrencyStamp,
        projectId: lesSablesId,
        customerType: 'LegalEntity',
        displayName: demoParty2.displayName,
        contactPerson: 'كريم منصوري / Karim Mansouri',
        phone: '+213 555 44 55 66',
        email: 'contact.atlas@promogest.local',
        address: 'باب الزوار، الجزائر / Bab Ezzouar, Alger',
        preferredLanguage: 'fr',
        source: 'Phone',
        status: 'Prospect',
        identityDocument: null,
        interactions: [],
        createdAtUtc: nowIso,
        updatedAtUtc: nowIso,
        concurrencyStamp: crypto.randomUUID(),
      },
    ]);
    projectReservations.set(lesSablesId, []);
    const demoDocContent = Buffer.from('PROMO GEST DEMO DOCUMENT PLACEHOLDER\n', 'utf8');
    projectDocuments.set(lesSablesId, [
      {
        meta: {
          id: '30000000-0000-0000-0000-000000000401',
          originalFileName: 'permis-construire-demo.txt',
          category: 'Permits',
          description: 'مرجع تجريبي لرخصة البناء / Référence démo permis de construire',
          contentType: 'text/plain',
          sizeBytes: demoDocContent.byteLength,
          sha256Checksum: crypto.createHash('sha256').update(demoDocContent).digest('hex'),
          uploadedByUserId: admin.id,
          uploadedByFullName: admin.fullName,
          createdAtUtc: nowIso,
        },
        content: demoDocContent,
      },
    ]);

    addAudit(
      'PREVIEW_DEMO_CREATED',
      'Info',
      'Temporary in-memory demo workspace created for Vite preview; no real organization data.',
      admin,
      'OrganizationSettings',
      organization.id
    );

    return admin;
  }

  return async (req, res, next) => {
        const rawUrl = req.url ?? '/';
        const parsedUrl = new URL(rawUrl, 'http://localhost:3000');
        const pathname = parsedUrl.pathname;

        if (!pathname.startsWith('/api/') && !pathname.startsWith('/health/')) {
          return next();
        }

        const method = (req.method ?? 'GET').toUpperCase();
        const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

        // Health
        if (method === 'GET' && pathname === '/health/live') {
          return sendJson(res, 200, {
            status: 'Healthy',
            timestampUtc: new Date().toISOString(),
            environmentMode: 'ViteDevContractPreview',
          });
        }

        if (method === 'GET' && pathname === '/health/ready') {
          return sendJson(res, 200, {
            status: 'Ready',
            databaseConnected: false,
            isInitialized: Boolean(organization),
            timestampUtc: new Date().toISOString(),
            environmentMode: 'ViteDevContractPreview',
            previewMode: true,
          });
        }

        // Public, read-only mirror of the production reference-data contract.
        if (method === 'GET' && pathname === '/api/reference/administrative-units') {
          return sendJson(res, 200, DEV_PREVIEW_ADMINISTRATIVE_REFERENCE, {
            'Cache-Control': 'no-store',
          });
        }

        const authCtx = getAuthenticatedSession(req);
        const sessionKey = authCtx ? authCtx.user.id : 'anon';

        // CSRF Token Endpoint
        if (method === 'GET' && pathname === '/api/auth/csrf') {
          const csrf = createCsrfPair(sessionKey, getCookieAttributes(req));
          return sendJson(
            res,
            200,
            { headerName: CSRF_HEADER_NAME, token: csrf.token },
            { 'Set-Cookie': csrf.cookies, [CSRF_HEADER_NAME]: csrf.token }
          );
        }

        // Enforce CSRF protection on all state-changing /api/* requests
        if (pathname.startsWith('/api/') && isMutating) {
          if (!validateCsrfRequest(req, sessionKey)) {
            return sendJson(res, 403, {
              code: 'CSRF_TOKEN_INVALID',
              message: 'Missing or invalid anti-forgery (CSRF) token.',
            });
          }
        }

        // Setup
        if (method === 'GET' && pathname === '/api/setup/status') {
          return sendJson(res, 200, {
            isInitialized: Boolean(organization),
            organizationLegalName: organization?.legalName ?? null,
            defaultLanguage: organization?.defaultLanguage ?? 'ar',
            requiresBootstrapToken: false,
          });
        }

        // Vite-preview-only demo access. This route does not exist in the production ASP.NET Core API.
        // GET is intentional here because some embedded preview hosts block state-changing requests.
        if (method === 'GET' && pathname === '/api/auth/preview-session') {
          const demoAdmin = ensurePreviewDemoData();
          if (!demoAdmin || !organization) {
            return sendJson(res, 409, {
              code: 'PREVIEW_DEMO_NOT_AVAILABLE',
              message: 'Demo access is only available before a real organization is initialized in this preview server.',
            });
          }
          demoAdmin.lastLoginAtUtc = new Date().toISOString();

          const rawToken = crypto.randomBytes(32).toString('base64url');
          sessions.push({
            tokenHash: hashToken(rawToken),
            userId: demoAdmin.id,
            securityStamp: demoAdmin.securityStamp,
            expiresAtMs: Date.now() + 12 * 3600_000,
          });

          addAudit('PREVIEW_DEMO_SESSION_OPENED', 'Info', 'Opened the disposable Vite demo workspace.', demoAdmin, 'UserSession');
          const cookieAttributes = getCookieAttributes(req);
          const nextCsrf = createCsrfPair(demoAdmin.id, cookieAttributes);

          return sendJson(
            res,
            200,
            {
              user: {
                id: demoAdmin.id,
                username: demoAdmin.username,
                fullName: demoAdmin.fullName,
                email: demoAdmin.email,
                phone: demoAdmin.phone,
                isSystemAdministrator: demoAdmin.isSystemAdministrator,
                isActive: demoAdmin.isActive,
                preferredLanguage: demoAdmin.preferredLanguage,
                roles: demoAdmin.roleCodes,
                permissions: getPermissions(demoAdmin),
                lastLoginAtUtc: demoAdmin.lastLoginAtUtc,
              },
              organization,
            },
            {
              'Set-Cookie': [
                `${COOKIE_NAME}=${rawToken}; ${cookieAttributes}; HttpOnly`,
                ...nextCsrf.cookies,
              ],
              [CSRF_HEADER_NAME]: nextCsrf.token,
              'X-PROMOGEST-PREVIEW-TOKEN': rawToken,
            }
          );
        }

        if (method === 'POST' && pathname === '/api/setup/initialize') {
          if (organization || users.some((u) => u.isSystemAdministrator)) {
            return sendJson(res, 409, {
              code: 'SETUP_ALREADY_INITIALIZED',
              message: 'Installation has already been initialized.',
            });
          }

          const body = await readJsonBody<InitializeInstallationRequest>(req);
          if (
            !body.legalName?.trim() ||
            !body.adminUsername?.trim() ||
            !body.adminEmail?.trim() ||
            !body.adminPassword ||
            !/^([0][1-9]|[1-4]\d|5[0-8])$/.test((body.wilayaCode || '').trim())
          ) {
            return sendJson(res, 400, {
              code: 'VALIDATION_ERROR',
              message: 'Required organization or administrator fields are missing or invalid.',
            });
          }
          if (body.adminPassword.length < 10) {
            return sendJson(res, 400, {
              code: 'PASSWORD_TOO_SHORT',
              message: 'Password must be at least 10 characters.',
            });
          }
          if (body.adminPassword.length > PASSWORD_MAX_LENGTH) {
            return sendJson(res, 400, {
              code: 'PASSWORD_TOO_LONG',
              message: `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`,
            });
          }

          const nowIso = new Date().toISOString();
          organization = {
            id: crypto.randomUUID(),
            legalName: body.legalName.trim(),
            tradeName: body.tradeName?.trim() || null,
            legalForm: (body.legalForm || 'SARL').trim().toUpperCase(),
            nif: body.nif?.trim() || null,
            nis: body.nis?.trim() || null,
            tradeRegisterNumber: body.tradeRegisterNumber?.trim() || null,
            taxArticleNumber: body.taxArticleNumber?.trim() || null,
            shareCapitalDzd: body.shareCapitalDzd ?? null,
            wilayaCode: body.wilayaCode.trim(),
            wilayaName: body.wilayaName || 'Alger',
            address: body.address.trim(),
            phone: body.organizationPhone?.trim() || null,
            email: body.organizationEmail?.trim() || null,
            defaultLanguage: body.defaultLanguage === 'fr' ? 'fr' : 'ar',
            currencyCode: 'DZD',
          };

          const admin: StoredUserRecord = {
            id: crypto.randomUUID(),
            username: body.adminUsername.trim(),
            fullName: body.adminFullName.trim(),
            email: body.adminEmail.trim(),
            phone: body.adminPhone?.trim() || null,
            isSystemAdministrator: true,
            isActive: true,
            preferredLanguage: organization.defaultLanguage,
            failedLoginAttempts: 0,
            lockoutEndUtc: null,
            lastLoginAtUtc: null,
            createdAtUtc: nowIso,
            roleCodes: ['SYSTEM_ADMIN'],
            passwordHash: hashPassword(body.adminPassword),
            securityStamp: crypto.randomUUID(),
          };

          users.push(admin);
          addAudit(
            'SETUP_INITIALIZED',
            'Security',
            `Installation initialized for '${organization.legalName}' with single System Administrator '${admin.username}'.`,
            admin,
            'OrganizationSettings',
            organization.id
          );

          return sendJson(res, 201, {
            organizationId: organization.id,
            organizationLegalName: organization.legalName,
            systemAdminUserId: admin.id,
            systemAdminUsername: admin.username,
            initializedAtUtc: nowIso,
          });
        }

        // Auth
        if (method === 'POST' && pathname === '/api/auth/login') {
          if (!organization) {
            return sendJson(res, 409, {
              code: 'SETUP_REQUIRED',
              message: 'System installation must be initialized before signing in.',
            });
          }

          const body = await readJsonBody<{ usernameOrEmail: string; password: string }>(req);
          const norm = (body.usernameOrEmail || '').trim().toLowerCase();
          if ((body.password || '').length > PASSWORD_MAX_LENGTH) {
            addAudit('AUTH_LOGIN_FAILED', 'Security', `Failed login exceeded password length limit for '${norm.slice(0, 32)}'.`, null, 'User');
            return sendJson(res, 401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid username or password.' });
          }

          const user = users.find((u) => u.username.toLowerCase() === norm || u.email.toLowerCase() === norm);

          // Generic error on ALL failed logins to prevent account enumeration
          if (!user) {
            addAudit('AUTH_LOGIN_FAILED', 'Security', `Unknown login attempt for '${(body.usernameOrEmail || '').slice(0, 64)}'.`, null, 'User');
            return sendJson(res, 401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid username or password.' });
          }

          if (!user.isActive) {
            addAudit('AUTH_LOGIN_BLOCKED_INACTIVE', 'Security', `Deactivated account '${user.username}' blocked.`, user, 'User', user.id);
            return sendJson(res, 401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid username or password.' });
          }

          if (user.lockoutEndUtc && new Date(user.lockoutEndUtc).getTime() > Date.now()) {
            addAudit('AUTH_LOGIN_BLOCKED_LOCKED', 'Security', `Locked account '${user.username}' blocked.`, user, 'User', user.id);
            return sendJson(res, 401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid username or password.' });
          }

          if (!verifyPassword(body.password || '', user.passwordHash)) {
            if (user.lockoutEndUtc && new Date(user.lockoutEndUtc).getTime() <= Date.now()) {
              user.failedLoginAttempts = 0;
              user.lockoutEndUtc = null;
            }
            user.failedLoginAttempts += 1;
            if (user.failedLoginAttempts >= 5) {
              user.lockoutEndUtc = new Date(Date.now() + 15 * 60_000).toISOString();
              addAudit('AUTH_LOCKOUT', 'Security', `Account '${user.username}' locked after 5 failed attempts.`, user, 'User', user.id);
            } else {
              addAudit('AUTH_LOGIN_FAILED', 'Security', `Failed password attempt (${user.failedLoginAttempts}/5) for '${user.username}'.`, user, 'User', user.id);
            }
            return sendJson(res, 401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid username or password.' });
          }

          user.failedLoginAttempts = 0;
          user.lockoutEndUtc = null;
          user.lastLoginAtUtc = new Date().toISOString();

          const rawToken = crypto.randomBytes(32).toString('base64url');
          sessions.push({
            tokenHash: hashToken(rawToken),
            userId: user.id,
            securityStamp: user.securityStamp,
            expiresAtMs: Date.now() + 12 * 3600_000,
          });

          addAudit('AUTH_LOGIN_SUCCESS', 'Info', `User '${user.username}' signed in.`, user, 'UserSession');
          const cookieAttributes = getCookieAttributes(req);
          const nextCsrf = createCsrfPair(user.id, cookieAttributes);

          return sendJson(
            res,
            200,
            {
              user: {
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                isSystemAdministrator: user.isSystemAdministrator,
                isActive: user.isActive,
                preferredLanguage: user.preferredLanguage,
                roles: user.roleCodes,
                permissions: getPermissions(user),
                lastLoginAtUtc: user.lastLoginAtUtc,
              },
              organization,
            },
            {
              'Set-Cookie': [
                `${COOKIE_NAME}=${rawToken}; ${cookieAttributes}; HttpOnly`,
                ...nextCsrf.cookies,
              ],
              [CSRF_HEADER_NAME]: nextCsrf.token,
            }
          );
        }

        if (method === 'POST' && pathname === '/api/auth/logout') {
          const cookies = parseCookies(req);
          const authorization = req.headers.authorization;
          const authorizationValue = Array.isArray(authorization) ? authorization[0] : authorization;
          const bearerToken = authorizationValue?.match(/^Bearer ([A-Za-z0-9_-]+)$/)?.[1] ?? null;
          const raw = bearerToken ?? cookies[COOKIE_NAME];
          if (raw) {
            const hashed = hashToken(raw);
            const idx = sessions.findIndex((s) => s.tokenHash === hashed);
            if (idx >= 0) {
              const user = users.find((u) => u.id === sessions[idx].userId);
              sessions.splice(idx, 1);
              addAudit('AUTH_LOGOUT', 'Info', `User '${user?.username ?? 'unknown'}' signed out.`, user, 'UserSession');
            }
          }
          const cookieAttributes = getCookieAttributes(req);
          const anonCsrf = createCsrfPair('anon', cookieAttributes);
          res.statusCode = 204;
          res.setHeader('Set-Cookie', [
            `${COOKIE_NAME}=; ${cookieAttributes}; Max-Age=0; HttpOnly`,
            ...anonCsrf.cookies,
          ]);
          res.setHeader(CSRF_HEADER_NAME, anonCsrf.token);
          res.end();
          return;
        }

        // Protected routes below
        const currentUser = authCtx?.user ?? null;
        if (!currentUser || !organization) {
          return sendJson(res, 401, { code: 'AUTH_REQUIRED', message: 'Authentication is required.' });
        }

        if (method === 'GET' && pathname === '/api/auth/me') {
          return sendJson(res, 200, {
            user: {
              id: currentUser.id,
              username: currentUser.username,
              fullName: currentUser.fullName,
              email: currentUser.email,
              phone: currentUser.phone,
              isSystemAdministrator: currentUser.isSystemAdministrator,
              isActive: currentUser.isActive,
              preferredLanguage: currentUser.preferredLanguage,
              roles: currentUser.roleCodes,
              permissions: getPermissions(currentUser),
              lastLoginAtUtc: currentUser.lastLoginAtUtc,
            },
            organization,
          });
        }

        // Users
        if (method === 'GET' && pathname === '/api/users/roles') {
          return sendJson(res, 200, SEEDED_ROLES);
        }

        if (method === 'GET' && pathname === '/api/users') {
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('users.manage')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized user directory listing.`, currentUser, 'User');
            return sendJson(res, 403, { code: 'FORBIDDEN_USER_MANAGEMENT', message: 'Forbidden.' });
          }
          return sendJson(res, 200, users.map(toPublicUser));
        }

        if (method === 'POST' && pathname === '/api/users') {
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('users.manage')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized employee creation.`, currentUser, 'User');
            return sendJson(res, 403, { code: 'FORBIDDEN_USER_MANAGEMENT', message: 'Forbidden.' });
          }
          const body = await readJsonBody<{
            username: string;
            fullName: string;
            email: string;
            phone?: string;
            password: string;
            preferredLanguage: 'ar' | 'fr';
            roleCodes: string[];
          }>(req);

          if (body.roleCodes?.includes('SYSTEM_ADMIN')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted to create a second SYSTEM_ADMIN.`, currentUser, 'User');
            return sendJson(res, 403, {
              code: 'SINGLE_SYSTEM_ADMIN_ONLY',
              message: 'Only one System Administrator account is permitted.',
            });
          }
          if (!body.password || body.password.length < 10) {
            return sendJson(res, 400, { code: 'PASSWORD_TOO_SHORT', message: 'Password must be at least 10 characters.' });
          }
          if (body.password.length > PASSWORD_MAX_LENGTH) {
            return sendJson(res, 400, { code: 'PASSWORD_TOO_LONG', message: `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.` });
          }
          if (users.some((u) => u.username.toLowerCase() === body.username.trim().toLowerCase() || u.email.toLowerCase() === body.email.trim().toLowerCase())) {
            return sendJson(res, 409, { code: 'USER_ALREADY_EXISTS', message: 'Username or email already exists.' });
          }

          const newUser: StoredUserRecord = {
            id: crypto.randomUUID(),
            username: body.username.trim(),
            fullName: body.fullName.trim(),
            email: body.email.trim(),
            phone: body.phone?.trim() || null,
            isSystemAdministrator: false,
            isActive: true,
            preferredLanguage: body.preferredLanguage === 'fr' ? 'fr' : 'ar',
            failedLoginAttempts: 0,
            lockoutEndUtc: null,
            lastLoginAtUtc: null,
            createdAtUtc: new Date().toISOString(),
            roleCodes: body.roleCodes,
            passwordHash: hashPassword(body.password),
            securityStamp: crypto.randomUUID(),
          };
          users.push(newUser);
          addAudit('USER_CREATED', 'Security', `Created employee account '${newUser.username}'.`, currentUser, 'User', newUser.id);
          return sendJson(res, 201, toPublicUser(newUser));
        }

        const userStatusMatch = pathname.match(/^\/api\/users\/([^/]+)\/status$/);
        if (method === 'PATCH' && userStatusMatch) {
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('users.manage')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized user status change.`, currentUser, 'User', userStatusMatch[1]);
            return sendJson(res, 403, { code: 'FORBIDDEN_USER_MANAGEMENT', message: 'Forbidden.' });
          }
          const target = users.find((u) => u.id === userStatusMatch[1]);
          if (!target) return sendJson(res, 404, { code: 'USER_NOT_FOUND', message: 'User not found.' });
          const body = await readJsonBody<{ isActive: boolean }>(req);
          if (target.isSystemAdministrator && !body.isActive) {
            return sendJson(res, 400, { code: 'CANNOT_DEACTIVATE_SYSTEM_ADMIN', message: 'Cannot deactivate System Administrator.' });
          }
          target.isActive = body.isActive;
          if (!body.isActive) target.securityStamp = crypto.randomUUID();
          addAudit(body.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'Security', `${body.isActive ? 'Activated' : 'Deactivated'} '${target.username}'.`, currentUser, 'User', target.id);
          return sendJson(res, 200, toPublicUser(target));
        }

        const userUpdateMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
        if (method === 'PUT' && userUpdateMatch) {
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('users.manage')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized user update.`, currentUser, 'User', userUpdateMatch[1]);
            return sendJson(res, 403, { code: 'FORBIDDEN_USER_MANAGEMENT', message: 'Forbidden.' });
          }
          const target = users.find((u) => u.id === userUpdateMatch[1]);
          if (!target) return sendJson(res, 404, { code: 'USER_NOT_FOUND', message: 'User not found.' });
          if (target.isSystemAdministrator && !currentUser.isSystemAdministrator) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted to modify System Administrator.`, currentUser, 'User', target.id);
            return sendJson(res, 403, { code: 'CANNOT_MODIFY_SYSTEM_ADMIN', message: 'Only System Administrator can modify own profile.' });
          }
          const body = await readJsonBody<{ fullName: string; email: string; phone?: string; preferredLanguage: 'ar' | 'fr'; roleCodes: string[] }>(req);
          if (!target.isSystemAdministrator && body.roleCodes.includes('SYSTEM_ADMIN')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted to promote '${target.username}' to SYSTEM_ADMIN.`, currentUser, 'User', target.id);
            return sendJson(res, 403, { code: 'SINGLE_SYSTEM_ADMIN_ONLY', message: 'Cannot promote employee to System Administrator.' });
          }
          target.fullName = body.fullName.trim();
          target.email = body.email.trim();
          target.phone = body.phone?.trim() || null;
          target.preferredLanguage = body.preferredLanguage === 'fr' ? 'fr' : 'ar';
          if (!target.isSystemAdministrator) target.roleCodes = body.roleCodes;
          addAudit('USER_UPDATED', 'Info', `Updated account '${target.username}'.`, currentUser, 'User', target.id);
          return sendJson(res, 200, toPublicUser(target));
        }

        const resetPwMatch = pathname.match(/^\/api\/users\/([^/]+)\/reset-password$/);
        if (method === 'POST' && resetPwMatch) {
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('users.manage')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized password reset.`, currentUser, 'User', resetPwMatch[1]);
            return sendJson(res, 403, { code: 'FORBIDDEN_USER_MANAGEMENT', message: 'Forbidden.' });
          }
          const target = users.find((u) => u.id === resetPwMatch[1]);
          if (!target) return sendJson(res, 404, { code: 'USER_NOT_FOUND', message: 'User not found.' });
          if (target.isSystemAdministrator && !currentUser.isSystemAdministrator) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted to reset System Administrator password.`, currentUser, 'User', target.id);
            return sendJson(res, 403, { code: 'CANNOT_MODIFY_SYSTEM_ADMIN', message: 'Forbidden.' });
          }
          const body = await readJsonBody<{ newPassword: string }>(req);
          if (!body.newPassword || body.newPassword.length < 10) {
            return sendJson(res, 400, { code: 'PASSWORD_TOO_SHORT', message: 'Password must be at least 10 characters.' });
          }
          if (body.newPassword.length > PASSWORD_MAX_LENGTH) {
            return sendJson(res, 400, { code: 'PASSWORD_TOO_LONG', message: `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.` });
          }
          target.passwordHash = hashPassword(body.newPassword);
          target.securityStamp = crypto.randomUUID();
          addAudit('USER_PASSWORD_RESET', 'Security', `Reset password for '${target.username}'.`, currentUser, 'User', target.id);
          res.statusCode = 204;
          res.end();
          return;
        }

        // Projects & Project-level authorization
        if (method === 'GET' && pathname === '/api/projects') {
          const q = (parsedUrl.searchParams.get('q') ?? '').trim().toLowerCase();
          const statusFilter = (parsedUrl.searchParams.get('status') ?? '').trim();
          let visible = currentUser.isSystemAdministrator
            ? projects
            : projects.filter((p) => p.members.some((m) => m.userId === currentUser.id));
          if (statusFilter) {
            visible = visible.filter((p) => p.status === statusFilter);
          }
          if (q) {
            visible = visible.filter((p) =>
              p.code.toLowerCase().includes(q) ||
              p.nameAr.toLowerCase().includes(q) ||
              p.nameFr.toLowerCase().includes(q) ||
              p.wilayaName.toLowerCase().includes(q) ||
              p.municipality.toLowerCase().includes(q)
            );
          }
          return sendJson(
            res,
            200,
            visible.map((project) => toProjectResponse(project, currentUser))
          );
        }

        if (method === 'POST' && pathname === '/api/projects') {
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('projects.create')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized project creation.`, currentUser, 'Project');
            return sendJson(res, 403, { code: 'FORBIDDEN_PROJECT_CREATE', message: 'Forbidden.' });
          }
          const body = await readJsonBody<any>(req);
          if (currentUser.isSystemAdministrator && Number(body.estimatedBudgetDzd ?? 0) !== 0) {
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `Unauthorized financial budget supplied during project creation by '${currentUser.username}'.`,
              currentUser,
              'Project'
            );
            return sendJson(res, 403, {
              code: 'PROJECT_FINANCIAL_ACCESS_DENIED',
              message: 'An explicit project financial capability is required to set an estimated budget.',
            });
          }
          const code = (body.code || '').trim().toUpperCase();
          if (projects.some((p) => p.code === code)) {
            return sendJson(res, 409, { code: 'PROJECT_CODE_EXISTS', message: 'Project code already exists.' });
          }
          const created: ProjectDto = {
            id: crypto.randomUUID(),
            code,
            nameAr: body.nameAr?.trim() || body.nameFr?.trim(),
            nameFr: body.nameFr?.trim() || body.nameAr?.trim(),
            wilayaCode: body.wilayaCode || '16',
            wilayaName: body.wilayaName || 'Alger',
            municipality: body.municipality.trim(),
            address: body.address?.trim() || null,
            landTitleReference: body.landTitleReference?.trim() || null,
            buildingPermitNumber: body.buildingPermitNumber?.trim() || null,
            buildingPermitDate: body.buildingPermitDate || null,
            status: body.status || 'Planning',
            estimatedBudgetDzd: Number(body.estimatedBudgetDzd || 0),
            plannedBlocksCount: Number(body.plannedBlocksCount || 0),
            plannedUnitsCount: Number(body.plannedUnitsCount || 0),
            actualBuildingsCount: 0,
            actualUnitsCount: 0,
            createdAtUtc: new Date().toISOString(),
            concurrencyStamp: crypto.randomUUID(),
            members: currentUser.isSystemAdministrator ? [] : [{
              id: crypto.randomUUID(),
              userId: currentUser.id,
              username: currentUser.username,
              fullName: currentUser.fullName,
              roleInProject: 'ProjectManager',
              canViewFinancials: true,
              canManageSales: true,
              canManageConstruction: true,
              canManageDocuments: true,
              assignedAtUtc: new Date().toISOString(),
            }],
          };
          projects.unshift(created);
          addAudit('PROJECT_CREATED', 'Info', `Created project '${created.code}' (${created.nameFr}).`, currentUser, 'Project', created.id);
          return sendJson(res, 201, toProjectResponse(created, currentUser));
        }

        const projectDetailMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
        if (method === 'GET' && projectDetailMatch) {
          const projectId = decodeURIComponent(projectDetailMatch[1]);
          const project = projects.find((p) => p.id === projectId);
          if (!currentUser.isSystemAdministrator && (!project || !project.members.some((m) => m.userId === currentUser.id))) {
            addAudit('ACCESS_DENIED', 'Security', `Unauthorized project access attempt by '${currentUser.username}' on '${projectId}'.`, currentUser, 'Project', projectId);
            return sendJson(res, 403, { code: 'PROJECT_ACCESS_DENIED', message: 'Project access denied.' });
          }
          if (!project) return sendJson(res, 404, { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
          return sendJson(res, 200, toProjectResponse(project, currentUser));
        }

        if (method === 'PUT' && projectDetailMatch) {
          const projectId = decodeURIComponent(projectDetailMatch[1]);
          const project = projects.find((p) => p.id === projectId);
          const permissions = getPermissions(currentUser);
          const membership = project?.members.find((member) => member.userId === currentUser.id);
          const canManageProject = currentUser.isSystemAdministrator ||
            (Boolean(project) && permissions.includes('projects.manage') &&
             membership?.roleInProject === 'ProjectManager');
          if (!canManageProject) {
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `Unauthorized project update attempt by '${currentUser.username}' on project ID '${projectId}'.`,
              currentUser,
              'Project',
              projectId
            );
            return sendJson(res, 403, {
              code: 'FORBIDDEN_PROJECT_UPDATE',
              message: "You must be an explicitly assigned Project Manager to update this project's master data.",
            });
          }
          if (!project) {
            return sendJson(res, 404, { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
          }
          try {
            const body = await readJsonBody<UpdateProjectRequest>(req);
            const canUpdateFinancialBudget =
              getPermissions(currentUser).includes('projects.manage') &&
              membership?.roleInProject === 'ProjectManager' &&
              membership?.canViewFinancials === true;
            if (body.estimatedBudgetDzd !== null &&
                body.estimatedBudgetDzd !== undefined &&
                !canUpdateFinancialBudget) {
              addAudit(
                'ACCESS_DENIED',
                'Security',
                `Unauthorized estimated-budget update attempt by '${currentUser.username}' on project '${project.code}'.`,
                currentUser,
                'Project',
                project.id
              );
              return sendJson(res, 403, {
                code: 'PROJECT_FINANCIAL_ACCESS_DENIED',
                message: 'Updating the estimated budget requires projects.manage, ProjectManager membership, and CanViewFinancials.',
              });
            }
            const updated = updateProjectInStore(project, body);
            addAudit(
              'PROJECT_UPDATED',
              'Info',
              `Updated master data for real estate project '${updated.code}'.`,
              currentUser,
              'Project',
              updated.id
            );
            return sendJson(res, 200, toProjectResponse(updated, currentUser));
          } catch (err) {
            if (err instanceof DevPreviewStoreError) {
              return sendJson(res, err.status, { code: err.code, message: err.message });
            }
            throw err;
          }
        }

        const authorizeStructureProject = (rawProjectId: string, canManage: boolean): ProjectDto | null => {
          const projectId = decodeURIComponent(rawProjectId);
          const project = projects.find((p) => p.id === projectId);
          if (!project && !currentUser.isSystemAdministrator) {
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `Unauthorized project-structure access attempt by '${currentUser.username}' on project ID '${projectId}'.`,
              currentUser,
              'Project',
              projectId
            );
            sendJson(res, 403, {
              code: canManage ? 'FORBIDDEN_PROJECT_STRUCTURE_MANAGE' : 'PROJECT_ACCESS_DENIED',
              message: 'Project access denied.',
            });
            return null;
          }
          if (!project) {
            sendJson(res, 404, { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
            return null;
          }
          const permissions = getPermissions(currentUser);
          const allowed = canUserAccessProjectStructure(
            {
              id: currentUser.id,
              isSystemAdministrator: currentUser.isSystemAdministrator,
              permissions,
            },
            project,
            canManage
          );
          if (!allowed) {
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `Unauthorized project-structure ${canManage ? 'management' : 'read'} attempt by '${currentUser.username}' on project '${project.code}'.`,
              currentUser,
              'Project',
              project.id
            );
            sendJson(res, 403, {
              code: canManage ? 'FORBIDDEN_PROJECT_STRUCTURE_MANAGE' : 'PROJECT_ACCESS_DENIED',
              message: canManage
                ? "You do not have permission to manage this project's building structure."
                : "You do not have access to this project's structure.",
            });
            return null;
          }
          return project;
        };

        // Project Structure (Buildings, Floors, Property Units)
        const structureRootMatch = pathname.match(/^\/api\/projects\/([^/]+)\/structure$/);
        if (method === 'GET' && structureRootMatch) {
          const project = authorizeStructureProject(structureRootMatch[1], false);
          if (!project) return;
          return sendJson(res, 200, getProjectStructure(projectStructures, project.id));
        }

        const createBuildingMatch = pathname.match(/^\/api\/projects\/([^/]+)\/structure\/buildings$/);
        if (method === 'POST' && createBuildingMatch) {
          const project = authorizeStructureProject(createBuildingMatch[1], true);
          if (!project) return;
          try {
            const body = await readJsonBody<CreateBuildingRequest>(req);
            const result = createBuildingInStore(projectStructures, project.id, body, new Date().toISOString());
            addAudit(
              'BUILDING_CREATED',
              'Info',
              `Created building '${result.building.code}' in project '${project.code}'.`,
              currentUser,
              'Building',
              result.building.id
            );
            return sendJson(res, 200, result.structure);
          } catch (err) {
            if (err instanceof DevPreviewStoreError) {
              return sendJson(res, err.status, { code: err.code, message: err.message });
            }
            throw err;
          }
        }

        const updateBuildingMatch = pathname.match(/^\/api\/projects\/([^/]+)\/structure\/buildings\/([^/]+)$/);
        if (method === 'PUT' && updateBuildingMatch) {
          const project = authorizeStructureProject(updateBuildingMatch[1], true);
          if (!project) return;
          try {
            const body = await readJsonBody<UpdateBuildingRequest>(req);
            const result = updateBuildingInStore(
              projectStructures,
              project.id,
              decodeURIComponent(updateBuildingMatch[2]),
              body,
              new Date().toISOString()
            );
            addAudit(
              'BUILDING_UPDATED',
              'Info',
              `Updated building '${result.previousCode}' to '${result.building.code}' in project '${project.code}'.`,
              currentUser,
              'Building',
              result.building.id
            );
            return sendJson(res, 200, result.structure);
          } catch (err) {
            if (err instanceof DevPreviewStoreError) {
              return sendJson(res, err.status, { code: err.code, message: err.message });
            }
            throw err;
          }
        }

        const createFloorMatch = pathname.match(/^\/api\/projects\/([^/]+)\/structure\/buildings\/([^/]+)\/floors$/);
        if (method === 'POST' && createFloorMatch) {
          const project = authorizeStructureProject(createFloorMatch[1], true);
          if (!project) return;
          try {
            const body = await readJsonBody<CreateBuildingFloorRequest>(req);
            const result = createFloorInStore(
              projectStructures,
              project.id,
              decodeURIComponent(createFloorMatch[2]),
              body,
              new Date().toISOString()
            );
            addAudit(
              'BUILDING_FLOOR_CREATED',
              'Info',
              `Created floor ${result.floor.floorNumber} in building '${result.building.code}' of project '${project.code}'.`,
              currentUser,
              'BuildingFloor',
              result.floor.id
            );
            return sendJson(res, 200, result.structure);
          } catch (err) {
            if (err instanceof DevPreviewStoreError) {
              return sendJson(res, err.status, { code: err.code, message: err.message });
            }
            throw err;
          }
        }

        const updateFloorMatch = pathname.match(/^\/api\/projects\/([^/]+)\/structure\/buildings\/([^/]+)\/floors\/([^/]+)$/);
        if (method === 'PUT' && updateFloorMatch) {
          const project = authorizeStructureProject(updateFloorMatch[1], true);
          if (!project) return;
          try {
            const body = await readJsonBody<UpdateBuildingFloorRequest>(req);
            const result = updateFloorInStore(
              projectStructures,
              project.id,
              decodeURIComponent(updateFloorMatch[2]),
              decodeURIComponent(updateFloorMatch[3]),
              body,
              new Date().toISOString()
            );
            addAudit(
              'BUILDING_FLOOR_UPDATED',
              'Info',
              `Updated floor ${result.previousNumber} to ${result.floor.floorNumber} in building '${result.building.code}' of project '${project.code}'.`,
              currentUser,
              'BuildingFloor',
              result.floor.id
            );
            return sendJson(res, 200, result.structure);
          } catch (err) {
            if (err instanceof DevPreviewStoreError) {
              return sendJson(res, err.status, { code: err.code, message: err.message });
            }
            throw err;
          }
        }

        const createUnitMatch = pathname.match(
          /^\/api\/projects\/([^/]+)\/structure\/buildings\/([^/]+)\/floors\/([^/]+)\/units$/
        );
        if (method === 'POST' && createUnitMatch) {
          const project = authorizeStructureProject(createUnitMatch[1], true);
          if (!project) return;
          try {
            const body = await readJsonBody<CreatePropertyUnitRequest>(req);
            const result = createUnitInStore(
              projectStructures,
              project.id,
              decodeURIComponent(createUnitMatch[2]),
              decodeURIComponent(createUnitMatch[3]),
              body,
              new Date().toISOString()
            );
            addAudit(
              'PROPERTY_UNIT_CREATED',
              'Info',
              `Created property unit '${result.unit.unitNumber}' (${result.unit.unitType}) on floor ${result.floor.floorNumber}, building '${result.building.code}', project '${project.code}'.`,
              currentUser,
              'PropertyUnit',
              result.unit.id
            );
            return sendJson(res, 200, result.structure);
          } catch (err) {
            if (err instanceof DevPreviewStoreError) {
              return sendJson(res, err.status, { code: err.code, message: err.message });
            }
            throw err;
          }
        }

        const updateUnitMatch = pathname.match(
          /^\/api\/projects\/([^/]+)\/structure\/buildings\/([^/]+)\/floors\/([^/]+)\/units\/([^/]+)$/
        );
        if (method === 'PUT' && updateUnitMatch) {
          const project = authorizeStructureProject(updateUnitMatch[1], true);
          if (!project) return;
          try {
            const body = await readJsonBody<UpdatePropertyUnitRequest>(req);
            const result = updateUnitInStore(
              projectStructures,
              project.id,
              decodeURIComponent(updateUnitMatch[2]),
              decodeURIComponent(updateUnitMatch[3]),
              decodeURIComponent(updateUnitMatch[4]),
              body,
              new Date().toISOString()
            );
            addAudit(
              'PROPERTY_UNIT_UPDATED',
              'Info',
              `Updated property unit '${result.previousNumber}' to '${result.unit.unitNumber}' in project '${project.code}' (type: ${result.previousType} -> ${result.unit.unitType}).`,
              currentUser,
              'PropertyUnit',
              result.unit.id
            );
            return sendJson(res, 200, result.structure);
          } catch (err) {
            if (err instanceof DevPreviewStoreError) {
              return sendJson(res, err.status, { code: err.code, message: err.message });
            }
            throw err;
          }
        }

        const changeUnitStatusMatch = pathname.match(
          /^\/api\/projects\/([^/]+)\/structure\/buildings\/([^/]+)\/floors\/([^/]+)\/units\/([^/]+)\/status$/
        );
        if (method === 'PUT' && changeUnitStatusMatch) {
          const project = authorizeStructureProject(changeUnitStatusMatch[1], true);
          if (!project) return;
          try {
            const body = await readJsonBody<ChangePropertyUnitStatusRequest>(req);
            const result = changeUnitStatusInStore(
              projectStructures,
              project.id,
              decodeURIComponent(changeUnitStatusMatch[2]),
              decodeURIComponent(changeUnitStatusMatch[3]),
              decodeURIComponent(changeUnitStatusMatch[4]),
              body,
              new Date().toISOString()
            );
            if (result.unit.status !== result.previousStatus) {
              addAudit(
                'PROPERTY_UNIT_STATUS_CHANGED',
                'Info',
                `Changed property unit '${result.unit.unitNumber}' status from ${result.previousStatus} to ${result.unit.status} in project '${project.code}'.`,
                currentUser,
                'PropertyUnit',
                result.unit.id
              );
            }
            return sendJson(res, 200, result.structure);
          } catch (err) {
            if (err instanceof DevPreviewStoreError) {
              return sendJson(res, err.status, { code: err.code, message: err.message });
            }
            throw err;
          }
        }

        const projectMembersMatch = pathname.match(/^\/api\/projects\/([^/]+)\/members$/);
        if (method === 'PUT' && projectMembersMatch) {
          const projectId = decodeURIComponent(projectMembersMatch[1]);
          const project = projects.find((p) => p.id === projectId);
          const actorMembership = project?.members.find((member) => member.userId === currentUser.id);
          const canManageTeam = currentUser.isSystemAdministrator ||
            (Boolean(project) && getPermissions(currentUser).includes('projects.access.manage') &&
             actorMembership?.roleInProject === 'ProjectManager');
          if (!canManageTeam) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized project membership assignment.`, currentUser, 'Project', projectId);
            return sendJson(res, 403, { code: 'FORBIDDEN_PROJECT_ACCESS_ADMIN', message: "Only an assigned Project Manager may manage this project's team." });
          }
          if (!project) return sendJson(res, 404, { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
          const body = await readJsonBody<{
            userId: string;
            roleInProject: string;
            canViewFinancials: boolean;
            canManageSales: boolean;
            canManageConstruction: boolean;
            canManageDocuments: boolean;
          }>(req);
          const target = users.find((u) => u.id === body.userId);
          if (!target) return sendJson(res, 404, { code: 'USER_NOT_FOUND', message: 'Employee not found.' });
          if (!target.isActive) return sendJson(res, 400, { code: 'USER_INACTIVE', message: 'Cannot assign an inactive employee.' });
          const validProjectRoles = ['ProjectManager', 'CommercialAgent', 'FinanceController', 'SiteSupervisor', 'ReadOnlyObserver'];
          if (!validProjectRoles.includes(body.roleInProject)) {
            return sendJson(res, 400, { code: 'PROJECT_ROLE_INVALID', message: 'Invalid project role.' });
          }
          const existingIdx = project.members.findIndex((m) => m.userId === target.id);
          if (existingIdx >= 0 &&
              project.members[existingIdx].roleInProject === 'ProjectManager' &&
              body.roleInProject !== 'ProjectManager' &&
              project.members.filter((m) => m.roleInProject === 'ProjectManager').length <= 1) {
            return sendJson(res, 409, { code: 'PROJECT_LAST_MANAGER_REQUIRED', message: 'Assign another Project Manager before changing the last Project Manager role.' });
          }
          const memberRecord = {
            id: existingIdx >= 0 ? project.members[existingIdx].id : crypto.randomUUID(),
            userId: target.id,
            username: target.username,
            fullName: target.fullName,
            roleInProject: body.roleInProject,
            canViewFinancials: Boolean(body.canViewFinancials),
            canManageSales: Boolean(body.canManageSales),
            canManageConstruction: Boolean(body.canManageConstruction),
            canManageDocuments: Boolean(body.canManageDocuments),
            assignedAtUtc: new Date().toISOString(),
          };
          if (existingIdx >= 0) project.members[existingIdx] = memberRecord;
          else {
            project.members.push(memberRecord);
            project.concurrencyStamp = crypto.randomUUID();
          }
          addAudit('PROJECT_MEMBER_ASSIGNED', 'Security', `Assigned '${target.username}' to '${project.code}' (${body.roleInProject}).`, currentUser, 'Project', project.id);
          return sendJson(res, 200, toProjectResponse(project, currentUser));
        }

        const removeMemberMatch = pathname.match(/^\/api\/projects\/([^/]+)\/members\/([^/]+)$/);
        if (method === 'DELETE' && removeMemberMatch) {
          const projectId = decodeURIComponent(removeMemberMatch[1]);
          const project = projects.find((p) => p.id === projectId);
          const actorMembership = project?.members.find((member) => member.userId === currentUser.id);
          const canManageTeam = currentUser.isSystemAdministrator ||
            (Boolean(project) && getPermissions(currentUser).includes('projects.access.manage') &&
             actorMembership?.roleInProject === 'ProjectManager');
          if (!canManageTeam) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized project membership revocation.`, currentUser, 'Project', projectId);
            return sendJson(res, 403, { code: 'FORBIDDEN_PROJECT_ACCESS_ADMIN', message: "Only an assigned Project Manager may manage this project's team." });
          }
          if (!project) return sendJson(res, 404, { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
          const targetUserId = decodeURIComponent(removeMemberMatch[2]);
          const targetMembership = project.members.find((m) => m.userId === targetUserId);
          if (targetMembership?.roleInProject === 'ProjectManager' &&
              project.members.filter((m) => m.roleInProject === 'ProjectManager').length <= 1) {
            return sendJson(res, 409, { code: 'PROJECT_LAST_MANAGER_REQUIRED', message: 'Assign another Project Manager before removing the last Project Manager.' });
          }
          project.members = project.members.filter((m) => m.userId !== targetUserId);
          project.concurrencyStamp = crypto.randomUUID();
          addAudit('PROJECT_MEMBER_REVOKED', 'Security', `Revoked access on '${project.code}' for user '${targetUserId}'.`, currentUser, 'Project', project.id);
          return sendJson(res, 200, toProjectResponse(project, currentUser));
        }

        // Parties Directory (Preview contract parity with ASP.NET Core 10)
        if (method === 'GET' && pathname === '/api/parties') {
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('parties.directory.read')) {
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `User '${currentUser.username}' attempted unauthorized party directory search.`,
              currentUser,
              'Party'
            );
            return sendJson(res, 403, {
              code: 'PARTY_DIRECTORY_ACCESS_DENIED',
              message: 'Party directory search permission is required.',
            });
          }
          const normalizedQuery = (parsedUrl.searchParams.get('query') ?? '').trim().replace(/\s+/g, ' ');
          if (normalizedQuery.length < 2 || normalizedQuery.length > 100) {
            return sendJson(res, 400, {
              code: 'PARTY_SEARCH_QUERY_INVALID',
              message: 'Party search query must be between 2 and 100 characters.',
            });
          }
          const lowerQuery = normalizedQuery.toLowerCase();
          const matches = parties
            .filter((party) => party.displayName.toLowerCase().includes(lowerQuery))
            .slice(0, 25);
          return sendJson(res, 200, matches, { 'Cache-Control': 'no-store' });
        }

        const updatePartyMatch = pathname.match(/^\/api\/parties\/([^/]+)$/);
        if (method === 'PUT' && updatePartyMatch) {
          const partyId = decodeURIComponent(updatePartyMatch[1]);
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('parties.identity.manage')) {
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `User '${currentUser.username}' attempted unauthorized party identity update.`,
              currentUser,
              'Party',
              partyId
            );
            return sendJson(res, 403, {
              code: 'PARTY_IDENTITY_MANAGE_REQUIRED',
              message: 'Managing shared party identities requires the parties.identity.manage permission.',
            });
          }
          const party = parties.find((p) => p.id === partyId);
          if (!party) return sendJson(res, 404, { code: 'PARTY_NOT_FOUND', message: 'Party not found.' });

          const body = await readJsonBody<{ kind: string; displayName: string; concurrencyStamp: string }>(req);
          if (body.kind !== 'Person' && body.kind !== 'LegalEntity') {
            return sendJson(res, 400, {
              code: 'PARTY_KIND_INVALID',
              message: 'Party kind must be Person or LegalEntity.',
            });
          }
          const normalizedDisplayName = String(body.displayName ?? '').trim();
          if (!normalizedDisplayName || normalizedDisplayName.length > 200) {
            return sendJson(res, 400, {
              code: 'VALIDATION_ERROR',
              message: 'Party display name must be between 1 and 200 characters.',
            });
          }
          if (!body.concurrencyStamp || body.concurrencyStamp !== party.concurrencyStamp) {
            return sendJson(res, 409, {
              code: 'PARTY_CONCURRENCY_CONFLICT',
              message: 'Party concurrency conflict.',
            });
          }
          const duplicateParty = parties.some(
            (other) =>
              other.id !== party.id &&
              other.kind === body.kind &&
              other.displayName.trim().toLowerCase() === normalizedDisplayName.toLowerCase()
          );
          if (duplicateParty) {
            return sendJson(res, 409, {
              code: 'PARTY_IDENTITY_CONFLICT',
              message: 'Another party with the same kind and display name already exists.',
            });
          }

          party.kind = body.kind;
          party.displayName = normalizedDisplayName;
          party.concurrencyStamp = crypto.randomUUID();
          for (const list of projectCustomers.values()) {
            for (const c of list) {
              if (c.partyId === party.id) {
                c.displayName = party.displayName;
                c.customerType = party.kind === 'Person' ? 'Individual' : 'LegalEntity';
                c.partyConcurrencyStamp = party.concurrencyStamp;
              }
            }
          }
          addAudit(
            'PARTY_IDENTITY_UPDATED',
            'Info',
            `Updated party '${party.displayName}' (${party.kind}).`,
            currentUser,
            'Party',
            party.id
          );
          return sendJson(res, 200, party);
        }

        // Shared project-scoped access helpers (matching ASP.NET Core 10)
        const currentPerms = getPermissions(currentUser);
        const canAccessDocumentCategory = (
          member: ProjectDto['members'][number] | undefined,
          category: string,
          isUpload: boolean
        ): boolean => {
          if (currentUser.isSystemAdministrator || member?.roleInProject === 'ProjectManager') {
            return ALLOWED_DOCUMENT_CATEGORIES.has(category);
          }
          switch (category) {
            case 'Financial':
              return Boolean(member?.canViewFinancials);
            case 'Commercial':
              return Boolean(member?.canManageSales);
            case 'Engineering':
            case 'Plans':
              return isUpload
                ? Boolean(member?.canManageConstruction)
                : Boolean(member?.canManageConstruction || member?.canManageDocuments);
            case 'Legal':
            case 'LandAndTitle':
              return Boolean(member?.canManageDocuments);
            case 'Permits':
            case 'Correspondence':
            case 'Other':
              return true;
            default:
              return false;
          }
        };

        const authorizeProjectCustomerScope = (
          rawId: string,
          writeMode: boolean
        ): { project: ProjectDto; member: ProjectDto['members'][number] | undefined } | null => {
          const id = decodeURIComponent(rawId);
          const project = projects.find((p) => p.id === id);
          if (!project) {
            if (currentUser.isSystemAdministrator) {
              sendJson(res, 404, { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
              return null;
            }
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `User '${currentUser.username}' attempted customer ${writeMode ? 'write' : 'read'} on inaccessible project '${id}'.`,
              currentUser,
              'Project',
              id
            );
            sendJson(res, 403, {
              code: writeMode ? 'FORBIDDEN_PROJECT_CUSTOMER_WRITE' : 'PROJECT_CUSTOMER_ACCESS_DENIED',
              message: 'Project customer access denied.',
            });
            return null;
          }
          const member = project.members.find((m) => m.userId === currentUser.id);
          const allowed = currentUser.isSystemAdministrator || (
            Boolean(member) &&
            currentPerms.includes('customers.read') &&
            (!writeMode ||
              ((member!.canManageSales || member!.roleInProject === 'ProjectManager') &&
                currentPerms.includes('customers.manage')))
          );
          if (!allowed) {
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `User '${currentUser.username}' attempted unauthorized customer ${writeMode ? 'write' : 'read'} on project '${project.code}'.`,
              currentUser,
              'Project',
              project.id
            );
            sendJson(res, 403, {
              code: writeMode ? 'FORBIDDEN_PROJECT_CUSTOMER_WRITE' : 'PROJECT_CUSTOMER_ACCESS_DENIED',
              message: writeMode
                ? 'Customer management permission and sales/manager project membership are required.'
                : 'Customer read permission and project membership are required.',
            });
            return null;
          }
          return { project, member };
        };

        const authorizeProjectReservationScope = (
          rawId: string,
          writeMode: boolean
        ): { project: ProjectDto; member: ProjectDto['members'][number] | undefined } | null => {
          const id = decodeURIComponent(rawId);
          const project = projects.find((p) => p.id === id);
          if (!project) {
            if (currentUser.isSystemAdministrator) {
              sendJson(res, 404, { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
              return null;
            }
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `User '${currentUser.username}' attempted reservation ${writeMode ? 'write' : 'read'} on inaccessible project '${id}'.`,
              currentUser,
              'Project',
              id
            );
            sendJson(res, 403, {
              code: writeMode ? 'FORBIDDEN_PROJECT_RESERVATION_WRITE' : 'PROJECT_RESERVATION_ACCESS_DENIED',
              message: 'Project reservation access denied.',
            });
            return null;
          }
          const member = project.members.find((m) => m.userId === currentUser.id);
          const allowed = currentUser.isSystemAdministrator || (
            Boolean(member) &&
            currentPerms.includes('sales.reservations.read') &&
            currentPerms.includes('customers.read') &&
            (!writeMode ||
              ((member!.canManageSales || member!.roleInProject === 'ProjectManager') &&
                currentPerms.includes('sales.reservations.manage')))
          );
          if (!allowed) {
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `User '${currentUser.username}' attempted unauthorized reservation ${writeMode ? 'write' : 'read'} on project '${project.code}'.`,
              currentUser,
              'Project',
              project.id
            );
            sendJson(res, 403, {
              code: writeMode ? 'FORBIDDEN_PROJECT_RESERVATION_WRITE' : 'PROJECT_RESERVATION_ACCESS_DENIED',
              message: writeMode
                ? 'Sales reservation management permission and sales/manager membership are required.'
                : 'Sales reservation read permission, customer read permission, and project membership are required.',
            });
            return null;
          }
          return { project, member };
        };

        const authorizeProjectDocumentScope = (
          rawId: string,
          uploadMode: boolean
        ): { project: ProjectDto; member: ProjectDto['members'][number] | undefined } | null => {
          const id = decodeURIComponent(rawId);
          const project = projects.find((p) => p.id === id);
          if (!project) {
            if (currentUser.isSystemAdministrator) {
              sendJson(res, 404, { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
              return null;
            }
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `User '${currentUser.username}' attempted document ${uploadMode ? 'upload' : 'access'} on inaccessible project '${id}'.`,
              currentUser,
              'Project',
              id
            );
            sendJson(res, 403, {
              code: uploadMode ? 'PROJECT_DOCUMENT_UPLOAD_DENIED' : 'PROJECT_DOCUMENT_ACCESS_DENIED',
              message: 'Project document access denied.',
            });
            return null;
          }
          const member = project.members.find((m) => m.userId === currentUser.id);
          const allowed = currentUser.isSystemAdministrator || (
            Boolean(member) &&
            currentPerms.includes('files.read') &&
            (!uploadMode || (member!.canManageDocuments && currentPerms.includes('files.write')))
          );
          if (!allowed) {
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `User '${currentUser.username}' attempted unauthorized document ${uploadMode ? 'upload' : 'access'} on project '${project.code}'.`,
              currentUser,
              'Project',
              project.id
            );
            sendJson(res, 403, {
              code: uploadMode ? 'PROJECT_DOCUMENT_UPLOAD_DENIED' : 'PROJECT_DOCUMENT_ACCESS_DENIED',
              message: uploadMode
                ? 'Document upload requires files.write, files.read, and project CanManageDocuments capability.'
                : 'Document access requires files.read and project membership.',
            });
            return null;
          }
          return { project, member };
        };

        const canReadDocumentMetadataForCustomers =
          currentUser.isSystemAdministrator || currentPerms.includes('files.read');

        const redactCustomerDto = (c: ProjectCustomerDto): ProjectCustomerDto =>
          canReadDocumentMetadataForCustomers ? c : { ...c, identityDocument: null };

        // Project Customers
        const customersListMatch = pathname.match(/^\/api\/projects\/([^/]+)\/customers$/);
        if (customersListMatch && method === 'GET') {
          const scope = authorizeProjectCustomerScope(customersListMatch[1], false);
          if (!scope) return;
          const rows = projectCustomers.get(scope.project.id) ?? [];
          addAudit(
            'PROJECT_CUSTOMERS_LISTED',
            'Info',
            `Listed ${rows.length} customer(s) in project '${scope.project.code}'.`,
            currentUser,
            'Project',
            scope.project.id
          );
          return sendJson(
            res,
            200,
            rows.map((c) => ({
              id: c.id,
              partyId: c.partyId,
              customerType: c.customerType,
              displayName: c.displayName,
              contactPerson: c.contactPerson,
              phone: c.phone,
              email: c.email,
              status: c.status,
              source: c.source,
              updatedAtUtc: c.updatedAtUtc,
              interactionCount: c.interactions.length,
              hasIdentityDocument: canReadDocumentMetadataForCustomers && Boolean(c.identityDocument),
              concurrencyStamp: c.concurrencyStamp,
            }))
          );
        }

        if (customersListMatch && method === 'POST') {
          const scope = authorizeProjectCustomerScope(customersListMatch[1], true);
          if (!scope) return;
          const body = await readJsonBody<any>(req);
          const customerType = body.customerType === 'LegalEntity' ? 'LegalEntity' : body.customerType === 'Individual' ? 'Individual' : null;
          if (!customerType) {
            return sendJson(res, 400, { code: 'VALIDATION_ERROR', message: 'Invalid customerType.' });
          }
          const phone = String(body.phone ?? '').trim();
          const requestedDisplayName = String(body.displayName ?? '').trim();
          if (!phone || (!body.partyId && !requestedDisplayName)) {
            return sendJson(res, 400, { code: 'VALIDATION_ERROR', message: 'Display name and phone are required.' });
          }
          const list = projectCustomers.get(scope.project.id) ?? [];

          let party: PartyDirectoryItemDto | undefined;
          if (body.partyId) {
            if (!currentUser.isSystemAdministrator && !currentPerms.includes('parties.directory.read')) {
              addAudit(
                'ACCESS_DENIED',
                'Security',
                `User '${currentUser.username}' attempted to link existing party '${body.partyId}' without parties.directory.read.`,
                currentUser,
                'Party',
                String(body.partyId)
              );
              return sendJson(res, 403, {
                code: 'PARTY_DIRECTORY_ACCESS_DENIED',
                message: 'Party directory read permission is required to link an existing shared party.',
              });
            }
            party = parties.find((p) => p.id === body.partyId);
            if (!party) {
              return sendJson(res, 404, { code: 'PARTY_NOT_FOUND', message: 'Party not found.' });
            }
            const expectedCustomerType = party.kind === 'LegalEntity' ? 'LegalEntity' : 'Individual';
            if (expectedCustomerType !== customerType) {
              return sendJson(res, 400, {
                code: 'PARTY_IDENTITY_MISMATCH',
                message: 'Customer type does not match the linked party kind.',
              });
            }
            if (list.some((c) => c.partyId === party!.id)) {
              return sendJson(res, 409, {
                code: 'CUSTOMER_PARTY_ALREADY_LINKED',
                message: 'This shared party is already linked as a customer in this project.',
              });
            }
          }

          if (
            list.some(
              (c) =>
                c.phone.trim().toLowerCase() === phone.toLowerCase() ||
                (requestedDisplayName && c.displayName.trim().toLowerCase() === requestedDisplayName.toLowerCase())
            )
          ) {
            return sendJson(res, 409, {
              code: 'CUSTOMER_DUPLICATE',
              message: 'A customer with the same name or phone already exists in this project.',
            });
          }

          let identityDocument: ProjectCustomerDto['identityDocument'] = null;
          if (body.identityDocumentStoredFileId) {
            if (!canReadDocumentMetadataForCustomers) {
              addAudit(
                'ACCESS_DENIED',
                'Security',
                `User '${currentUser.username}' attempted to attach identity document '${body.identityDocumentStoredFileId}' without files.read.`,
                currentUser,
                'StoredFile',
                String(body.identityDocumentStoredFileId)
              );
              return sendJson(res, 403, {
                code: 'CUSTOMER_IDENTITY_DOCUMENT_ACCESS_DENIED',
                message: 'Viewing or linking KYC identity documents requires files.read permission.',
              });
            }
            const docEntry = (projectDocuments.get(scope.project.id) ?? []).find(
              (d) => d.meta.id === body.identityDocumentStoredFileId
            );
            if (!docEntry) {
              return sendJson(res, 404, { code: 'DOCUMENT_NOT_FOUND', message: 'Referenced document not found.' });
            }
            if (!canAccessDocumentCategory(scope.member, docEntry.meta.category, false)) {
              addAudit(
                'ACCESS_DENIED',
                'Security',
                `User '${currentUser.username}' attempted to link forbidden document category '${docEntry.meta.category}' as KYC identity document.`,
                currentUser,
                'StoredFile',
                docEntry.meta.id
              );
              return sendJson(res, 403, {
                code: 'PROJECT_DOCUMENT_ACCESS_DENIED',
                message: 'Document category access denied.',
              });
            }
            identityDocument = {
              id: docEntry.meta.id,
              originalFileName: docEntry.meta.originalFileName,
              category: docEntry.meta.category,
              sizeBytes: docEntry.meta.sizeBytes,
            };
          }

          const nowIso = new Date().toISOString();
          if (!party) {
            const desiredKind = customerType === 'LegalEntity' ? 'LegalEntity' : 'Person';
            party = {
              id: crypto.randomUUID(),
              kind: desiredKind,
              displayName: requestedDisplayName,
              concurrencyStamp: crypto.randomUUID(),
            };
            parties.push(party);
          }

          const created: ProjectCustomerDto = {
            id: crypto.randomUUID(),
            partyId: party.id,
            partyConcurrencyStamp: party.concurrencyStamp,
            projectId: scope.project.id,
            customerType,
            displayName: party.displayName,
            contactPerson: body.contactPerson?.trim() || null,
            phone,
            email: body.email?.trim() || null,
            address: body.address?.trim() || null,
            preferredLanguage: body.preferredLanguage === 'fr' ? 'fr' : 'ar',
            source: body.source ?? 'WalkIn',
            status: 'Prospect',
            identityDocument,
            interactions: [],
            createdAtUtc: nowIso,
            updatedAtUtc: nowIso,
            concurrencyStamp: crypto.randomUUID(),
          };
          list.unshift(created);
          projectCustomers.set(scope.project.id, list);
          addAudit(
            'PROJECT_CUSTOMER_CREATED',
            'Info',
            `Created customer '${created.displayName}' in project '${scope.project.code}'.`,
            currentUser,
            'ProjectCustomer',
            created.id
          );
          return sendJson(res, 201, redactCustomerDto(created));
        }

        const customerDetailMatch = pathname.match(/^\/api\/projects\/([^/]+)\/customers\/([^/]+)$/);
        if (customerDetailMatch && method === 'GET') {
          const scope = authorizeProjectCustomerScope(customerDetailMatch[1], false);
          if (!scope) return;
          const item = (projectCustomers.get(scope.project.id) ?? []).find(
            (c) => c.id === decodeURIComponent(customerDetailMatch[2])
          );
          if (!item) return sendJson(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
          addAudit(
            'PROJECT_CUSTOMER_VIEWED',
            'Info',
            `Viewed customer '${item.displayName}' in project '${scope.project.code}'.`,
            currentUser,
            'ProjectCustomer',
            item.id
          );
          return sendJson(res, 200, redactCustomerDto(item));
        }

        if (customerDetailMatch && method === 'PUT') {
          const scope = authorizeProjectCustomerScope(customerDetailMatch[1], true);
          if (!scope) return;
          const list = projectCustomers.get(scope.project.id) ?? [];
          const item = list.find((c) => c.id === decodeURIComponent(customerDetailMatch[2]));
          if (!item) return sendJson(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
          const body = await readJsonBody<any>(req);

          if (body.concurrencyStamp !== item.concurrencyStamp) {
            return sendJson(res, 409, { code: 'CONCURRENCY_CONFLICT', message: 'Concurrency conflict.' });
          }

          const party = item.partyId ? parties.find((p) => p.id === item.partyId) : undefined;
          if (!party || body.partyConcurrencyStamp !== party.concurrencyStamp) {
            return sendJson(res, 409, {
              code: 'PARTY_CONCURRENCY_CONFLICT',
              message: 'Shared party concurrency conflict.',
            });
          }

          const nextPhone = String(body.phone ?? item.phone).trim();
          const nextDisplayName = String(body.displayName ?? item.displayName).trim();
          const nextCustomerType =
            body.customerType === 'LegalEntity'
              ? 'LegalEntity'
              : body.customerType === 'Individual'
                ? 'Individual'
                : item.customerType;
          if (!nextPhone || !nextDisplayName) {
            return sendJson(res, 400, { code: 'VALIDATION_ERROR', message: 'Display name and phone are required.' });
          }

          if (
            list.some(
              (other) =>
                other.id !== item.id &&
                (other.phone.trim().toLowerCase() === nextPhone.toLowerCase() ||
                  other.displayName.trim().toLowerCase() === nextDisplayName.toLowerCase())
            )
          ) {
            return sendJson(res, 409, {
              code: 'CUSTOMER_DUPLICATE',
              message: 'Another customer with the same name or phone already exists in this project.',
            });
          }

          const identityChanged = nextDisplayName !== item.displayName || nextCustomerType !== item.customerType;
          if (identityChanged) {
            if (!currentUser.isSystemAdministrator && !currentPerms.includes('parties.identity.manage')) {
              addAudit(
                'ACCESS_DENIED',
                'Security',
                `User '${currentUser.username}' attempted shared party identity edit without parties.identity.manage.`,
                currentUser,
                'Party',
                party.id
              );
              return sendJson(res, 403, {
                code: 'PARTY_IDENTITY_MANAGE_REQUIRED',
                message: 'Changing customer display name or legal type requires parties.identity.manage permission.',
              });
            }
            const nextPartyKind = nextCustomerType === 'LegalEntity' ? 'LegalEntity' : 'Person';
            if (
              parties.some(
                (other) =>
                  other.id !== party.id &&
                  other.kind === nextPartyKind &&
                  other.displayName.trim().toLowerCase() === nextDisplayName.toLowerCase()
              )
            ) {
              return sendJson(res, 409, {
                code: 'PARTY_IDENTITY_CONFLICT',
                message: 'Another shared party with the same kind and display name already exists.',
              });
            }
            party.kind = nextPartyKind;
            party.displayName = nextDisplayName;
            party.concurrencyStamp = crypto.randomUUID();
            for (const pList of projectCustomers.values()) {
              for (const linked of pList) {
                if (linked.partyId === party.id) {
                  linked.displayName = party.displayName;
                  linked.customerType = nextPartyKind === 'Person' ? 'Individual' : 'LegalEntity';
                  linked.partyConcurrencyStamp = party.concurrencyStamp;
                }
              }
            }
            addAudit(
              'PARTY_IDENTITY_UPDATED',
              'Info',
              `Updated shared party '${party.displayName}' via customer edit.`,
              currentUser,
              'Party',
              party.id
            );
          }

          const requestedDocId = body.identityDocumentStoredFileId ?? null;
          if (!canReadDocumentMetadataForCustomers) {
            if (requestedDocId) {
              addAudit(
                'ACCESS_DENIED',
                'Security',
                `User '${currentUser.username}' attempted to modify customer KYC identity document without files.read.`,
                currentUser,
                'StoredFile',
                String(requestedDocId)
              );
              return sendJson(res, 403, {
                code: 'CUSTOMER_IDENTITY_DOCUMENT_ACCESS_DENIED',
                message: 'Linking KYC identity documents requires files.read permission.',
              });
            }
            // Preserve existing hidden identity document reference when caller lacks files.read
          } else if (requestedDocId !== (item.identityDocument?.id ?? null)) {
            if (!requestedDocId) {
              item.identityDocument = null;
            } else {
              const docEntry = (projectDocuments.get(scope.project.id) ?? []).find(
                (d) => d.meta.id === requestedDocId
              );
              if (!docEntry) {
                return sendJson(res, 404, { code: 'DOCUMENT_NOT_FOUND', message: 'Referenced document not found.' });
              }
              if (!canAccessDocumentCategory(scope.member, docEntry.meta.category, false)) {
                addAudit(
                  'ACCESS_DENIED',
                  'Security',
                  `User '${currentUser.username}' attempted to link forbidden document category '${docEntry.meta.category}' as KYC identity document.`,
                  currentUser,
                  'StoredFile',
                  docEntry.meta.id
                );
                return sendJson(res, 403, {
                  code: 'PROJECT_DOCUMENT_ACCESS_DENIED',
                  message: 'Document category access denied.',
                });
              }
              item.identityDocument = {
                id: docEntry.meta.id,
                originalFileName: docEntry.meta.originalFileName,
                category: docEntry.meta.category,
                sizeBytes: docEntry.meta.sizeBytes,
              };
            }
          }

          item.contactPerson = body.contactPerson?.trim() || null;
          item.phone = nextPhone;
          item.email = body.email?.trim() || null;
          item.address = body.address?.trim() || null;
          item.preferredLanguage = body.preferredLanguage === 'fr' ? 'fr' : 'ar';
          item.source = body.source ?? item.source;
          item.status = body.status ?? item.status;
          item.updatedAtUtc = new Date().toISOString();
          item.concurrencyStamp = crypto.randomUUID();
          addAudit(
            'PROJECT_CUSTOMER_UPDATED',
            'Info',
            `Updated customer '${item.displayName}' in project '${scope.project.code}'.`,
            currentUser,
            'ProjectCustomer',
            item.id
          );
          return sendJson(res, 200, redactCustomerDto(item));
        }

        const customerInteractionMatch = pathname.match(/^\/api\/projects\/([^/]+)\/customers\/([^/]+)\/interactions$/);
        if (customerInteractionMatch && method === 'POST') {
          const scope = authorizeProjectCustomerScope(customerInteractionMatch[1], true);
          if (!scope) return;
          const item = (projectCustomers.get(scope.project.id) ?? []).find(
            (c) => c.id === decodeURIComponent(customerInteractionMatch[2])
          );
          if (!item) return sendJson(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found.' });
          const body = await readJsonBody<any>(req);
          const subject = String(body.subject ?? '').trim();
          const summary = String(body.summary ?? '').trim();
          if (!subject || !summary) {
            return sendJson(res, 400, { code: 'VALIDATION_ERROR', message: 'Subject and summary are required.' });
          }
          const interaction = {
            id: crypto.randomUUID(),
            type: String(body.type ?? 'Call'),
            subject,
            summary,
            occurredAtUtc: new Date().toISOString(),
            nextFollowUpAtUtc: body.nextFollowUpAtUtc ?? null,
            createdByFullName: currentUser.fullName,
          };
          item.interactions.unshift(interaction);
          item.updatedAtUtc = new Date().toISOString();
          addAudit(
            'PROJECT_CUSTOMER_INTERACTION_ADDED',
            'Info',
            `Added ${interaction.type} interaction for '${item.displayName}' in project '${scope.project.code}'.`,
            currentUser,
            'ProjectCustomer',
            item.id
          );
          return sendJson(res, 201, interaction);
        }

        // Internal Reservations (Preview contract parity with ASP.NET Core 10)
        const reservationsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/reservations$/);
        if (reservationsMatch && method === 'GET') {
          const scope = authorizeProjectReservationScope(reservationsMatch[1], false);
          if (!scope) return;
          const rows = projectReservations.get(scope.project.id) ?? [];
          addAudit(
            'PROJECT_RESERVATIONS_LISTED',
            'Info',
            `Listed ${rows.length} internal reservation(s) in project '${scope.project.code}'.`,
            currentUser,
            'Project',
            scope.project.id
          );
          return sendJson(res, 200, rows);
        }

        if (reservationsMatch && method === 'POST') {
          const scope = authorizeProjectReservationScope(reservationsMatch[1], true);
          if (!scope) return;
          const body = await readJsonBody<{ propertyUnitId: string; projectCustomerId: string; expiresAtUtc: string }>(req);
          const expiresMs = Date.parse(body.expiresAtUtc ?? '');
          if (Number.isNaN(expiresMs) || expiresMs <= Date.now()) {
            return sendJson(res, 400, {
              code: 'RESERVATION_EXPIRY_INVALID',
              message: 'Reservation expiry must be a valid future timestamp.',
            });
          }

          const structure = getProjectStructure(projectStructures, scope.project.id);
          const unit = structure.buildings
            .flatMap((b) => b.floors)
            .flatMap((f) => f.units)
            .find((u) => u.id === body.propertyUnitId);
          if (!unit) {
            return sendJson(res, 404, { code: 'PROPERTY_UNIT_NOT_FOUND', message: 'Property unit not found.' });
          }
          if (unit.status !== 'AvailableForSale') {
            return sendJson(res, 409, {
              code: 'RESERVATION_UNIT_UNAVAILABLE',
              message: 'Only units in AvailableForSale status can receive an internal reservation hold.',
            });
          }

          const customer = (projectCustomers.get(scope.project.id) ?? []).find(
            (c) => c.id === body.projectCustomerId
          );
          if (!customer) {
            return sendJson(res, 404, { code: 'CUSTOMER_NOT_FOUND', message: 'Project customer not found.' });
          }
          if (customer.status === 'Archived') {
            return sendJson(res, 400, {
              code: 'RESERVATION_CUSTOMER_ARCHIVED',
              message: 'Archived customers cannot hold a new reservation.',
            });
          }

          const rawStruct = projectStructures.get(scope.project.id);
          for (const b of rawStruct?.buildings ?? []) {
            for (const f of b.floors) {
              const target = f.units.find((u) => u.id === unit.id);
              if (target) {
                target.status = 'Reserved';
                target.concurrencyStamp = crypto.randomUUID();
              }
            }
          }
          const nowIso = new Date().toISOString();
          const list = projectReservations.get(scope.project.id) ?? [];
          const created: ProjectSalesReservationDto = {
            id: crypto.randomUUID(),
            projectId: scope.project.id,
            propertyUnitId: unit.id,
            unitNumber: unit.unitNumber,
            projectCustomerId: customer.id,
            customerName: customer.displayName,
            reservationNumber: `HOLD-${scope.project.code}-${String(list.length + 1).padStart(3, '0')}`,
            status: 'Active',
            reservedAtUtc: nowIso,
            expiresAtUtc: new Date(expiresMs).toISOString(),
            closedAtUtc: null,
            closedByUserId: null,
            closeReason: null,
            createdByUserId: currentUser.id,
            createdAtUtc: nowIso,
            concurrencyStamp: crypto.randomUUID(),
          };
          list.unshift(created);
          projectReservations.set(scope.project.id, list);
          addAudit(
            'PROJECT_RESERVATION_CREATED',
            'Info',
            `Created internal hold '${created.reservationNumber}' for unit '${unit.unitNumber}'.`,
            currentUser,
            'ProjectSalesReservation',
            created.id
          );
          return sendJson(res, 201, created);
        }

        const cancelResMatch = pathname.match(/^\/api\/projects\/([^/]+)\/reservations\/([^/]+)\/cancel$/);
        if (cancelResMatch && method === 'POST') {
          const scope = authorizeProjectReservationScope(cancelResMatch[1], true);
          if (!scope) return;
          const list = projectReservations.get(scope.project.id) ?? [];
          const resItem = list.find((r) => r.id === decodeURIComponent(cancelResMatch[2]));
          if (!resItem) return sendJson(res, 404, { code: 'RESERVATION_NOT_FOUND', message: 'Reservation not found.' });
          const body = await readJsonBody<{ reason: string; expectedConcurrencyStamp: string }>(req);
          const trimmedReason = String(body.reason ?? '').trim();
          if (!trimmedReason) {
            return sendJson(res, 400, {
              code: 'RESERVATION_CANCEL_REASON_REQUIRED',
              message: 'Cancellation reason is required.',
            });
          }
          if (body.expectedConcurrencyStamp !== resItem.concurrencyStamp) {
            return sendJson(res, 409, { code: 'CONCURRENCY_CONFLICT', message: 'Concurrency conflict.' });
          }
          if (resItem.status !== 'Active' || new Date(resItem.expiresAtUtc).getTime() <= Date.now()) {
            return sendJson(res, 409, {
              code: 'RESERVATION_EXPIRY_REACHED',
              message: 'Only active, unexpired reservations can be cancelled.',
            });
          }

          const rawStruct = projectStructures.get(scope.project.id);
          let targetUnit: { status: string; concurrencyStamp: string } | undefined;
          for (const b of rawStruct?.buildings ?? []) {
            for (const f of b.floors) {
              const found = f.units.find((u) => u.id === resItem.propertyUnitId);
              if (found) targetUnit = found;
            }
          }
          if (!targetUnit || targetUnit.status !== 'Reserved') {
            return sendJson(res, 409, {
              code: 'RESERVATION_UNIT_STATE_MISMATCH',
              message: 'Linked unit is no longer in Reserved status.',
            });
          }

          targetUnit.status = 'AvailableForSale';
          targetUnit.concurrencyStamp = crypto.randomUUID();
          resItem.status = 'Cancelled';
          resItem.closeReason = trimmedReason;
          resItem.closedAtUtc = new Date().toISOString();
          resItem.closedByUserId = currentUser.id;
          resItem.concurrencyStamp = crypto.randomUUID();
          addAudit(
            'PROJECT_RESERVATION_CANCELLED',
            'Info',
            `Cancelled internal hold '${resItem.reservationNumber}' on unit '${resItem.unitNumber}'.`,
            currentUser,
            'ProjectSalesReservation',
            resItem.id
          );
          return sendJson(res, 200, resItem);
        }

        // Project Documents (Preview contract parity with ASP.NET Core 10)
        const isCustomerIdentityDoc = (projectId: string, docId: string): boolean =>
          (projectCustomers.get(projectId) ?? []).some((c) => c.identityDocument?.id === docId);

        const docsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/documents$/);
        if (docsMatch && method === 'GET') {
          const scope = authorizeProjectDocumentScope(docsMatch[1], false);
          if (!scope) return;
          const canReadCustomers =
            currentUser.isSystemAdministrator ||
            (Boolean(scope.member) && currentPerms.includes('customers.read'));
          const docs = (projectDocuments.get(scope.project.id) ?? [])
            .filter(
              (d) =>
                canAccessDocumentCategory(scope.member, d.meta.category, false) &&
                (!isCustomerIdentityDoc(scope.project.id, d.meta.id) || canReadCustomers)
            )
            .map((d) => d.meta);
          return sendJson(res, 200, docs, { 'Cache-Control': 'no-store' });
        }

        if (docsMatch && method === 'POST') {
          const scope = authorizeProjectDocumentScope(docsMatch[1], true);
          if (!scope) return;
          try {
            const rawBody = await readRawBody(req, MAX_DOCUMENT_BYTES + 1024 * 1024);
            const parsed = parseMultipartFormData(rawBody, req.headers['content-type']);
            if (!parsed) {
              return sendJson(res, 400, { code: 'VALIDATION_ERROR', message: 'Expected multipart/form-data payload.' });
            }
            const file = parsed.files.file;
            if (!file || file.content.byteLength === 0) {
              return sendJson(res, 400, { code: 'DOCUMENT_EMPTY', message: 'An uploaded non-empty file is required.' });
            }
            if (file.content.byteLength > MAX_DOCUMENT_BYTES) {
              return sendJson(res, 400, { code: 'DOCUMENT_TOO_LARGE', message: 'File exceeds maximum allowed size of 25 MB.' });
            }
            const extMatch = file.fileName.toLowerCase().match(/(\.[a-z0-9]+)$/);
            const ext = extMatch?.[1] ?? '';
            if (!ALLOWED_DOCUMENT_EXTENSIONS.has(ext)) {
              return sendJson(res, 400, {
                code: 'DOCUMENT_EXTENSION_NOT_ALLOWED',
                message: `Extension '${ext || '(none)'}' is not allowed.`,
              });
            }
            const category = (parsed.fields.category ?? '').trim();
            if (!ALLOWED_DOCUMENT_CATEGORIES.has(category)) {
              return sendJson(res, 400, {
                code: 'DOCUMENT_CATEGORY_INVALID',
                message: 'Invalid document category.',
              });
            }
            if (!canAccessDocumentCategory(scope.member, category, true)) {
              addAudit(
                'ACCESS_DENIED',
                'Security',
                `User '${currentUser.username}' attempted unauthorized document upload into category '${category}' on project '${scope.project.code}'.`,
                currentUser,
                'Project',
                scope.project.id
              );
              return sendJson(res, 403, {
                code: 'PROJECT_DOCUMENT_CATEGORY_FORBIDDEN',
                message: `You do not have permission to upload documents in category '${category}'.`,
              });
            }

            const description = (parsed.fields.description ?? '').trim() || null;
            const nowIso = new Date().toISOString();
            const meta: ProjectDocumentDto = {
              id: crypto.randomUUID(),
              originalFileName: file.fileName || `document${ext}`,
              category,
              description,
              contentType: file.contentType,
              sizeBytes: file.content.byteLength,
              sha256Checksum: crypto.createHash('sha256').update(file.content).digest('hex'),
              uploadedByUserId: currentUser.id,
              uploadedByFullName: currentUser.fullName,
              createdAtUtc: nowIso,
            };
            const existingDocs = projectDocuments.get(scope.project.id) ?? [];
            existingDocs.unshift({ meta, content: file.content });
            projectDocuments.set(scope.project.id, existingDocs);
            addAudit(
              'PROJECT_DOCUMENT_UPLOADED',
              'Info',
              `Uploaded document '${meta.originalFileName}' (${meta.category}, ${meta.sizeBytes} bytes) to project '${scope.project.code}'.`,
              currentUser,
              'StoredFile',
              meta.id
            );
            return sendJson(res, 201, meta);
          } catch (err) {
            if (err instanceof DevPreviewStoreError) {
              return sendJson(res, err.status, { code: err.code, message: err.message });
            }
            throw err;
          }
        }

        const docDownloadMatch = pathname.match(/^\/api\/projects\/([^/]+)\/documents\/([^/]+)\/download$/);
        if (docDownloadMatch && method === 'GET') {
          const scope = authorizeProjectDocumentScope(docDownloadMatch[1], false);
          if (!scope) return;
          const docId = decodeURIComponent(docDownloadMatch[2]);
          const entry = (projectDocuments.get(scope.project.id) ?? []).find((d) => d.meta.id === docId);
          if (!entry) return sendJson(res, 404, { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found.' });

          const canReadCustomers =
            currentUser.isSystemAdministrator ||
            (Boolean(scope.member) && currentPerms.includes('customers.read'));
          if (
            !canAccessDocumentCategory(scope.member, entry.meta.category, false) ||
            (isCustomerIdentityDoc(scope.project.id, entry.meta.id) && !canReadCustomers)
          ) {
            addAudit(
              'ACCESS_DENIED',
              'Security',
              `User '${currentUser.username}' attempted unauthorized download of document '${entry.meta.originalFileName}' (${entry.meta.category}).`,
              currentUser,
              'StoredFile',
              entry.meta.id
            );
            return sendJson(res, 403, {
              code: 'PROJECT_DOCUMENT_ACCESS_DENIED',
              message: 'You do not have permission to download this document.',
            });
          }

          addAudit(
            'PROJECT_DOCUMENT_DOWNLOADED',
            'Info',
            `Downloaded document '${entry.meta.originalFileName}' from project '${scope.project.code}'.`,
            currentUser,
            'StoredFile',
            entry.meta.id
          );
          res.statusCode = 200;
          res.setHeader('Content-Type', entry.meta.contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${entry.meta.originalFileName}"`);
          res.end(entry.content);
          return;
        }

        // Audit
        if (method === 'GET' && pathname === '/api/audit') {
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('audit.read')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized audit log access.`, currentUser, 'AuditLog');
            return sendJson(res, 403, { code: 'FORBIDDEN_AUDIT_READ', message: 'Forbidden.' });
          }
          const limit = Number(parsedUrl.searchParams.get('limit') ?? '100');
          return sendJson(res, 200, auditLogs.slice(0, Math.min(Math.max(limit, 1), 250)));
        }

        return sendJson(res, 404, { code: 'ENDPOINT_NOT_FOUND', message: 'Endpoint not found.' });
  };
}

export function createPromoGestDevApiPlugin(): Plugin {
  const middleware = createPromoGestDevMiddleware();
  return {
    name: 'promogest-dev-api-contract',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
