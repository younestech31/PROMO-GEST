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
  InitializeInstallationRequest,
  OrganizationSummary,
  ProjectDto,
  RoleDto,
  UserDto,
} from './src/types/erp';
import { getDevPreviewCookieAttributes } from './src/utils/devPreviewCookies';

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
    'audit.read', 'files.read', 'files.write',
  ],
  PROJECT_DIRECTOR: ['org.read', 'projects.read', 'projects.create', 'projects.manage', 'projects.access.manage', 'files.read', 'files.write'],
  COMMERCIAL_MANAGER: ['org.read', 'projects.read', 'files.read', 'files.write'],
  FINANCE_OFFICER: ['org.read', 'projects.read', 'files.read', 'files.write'],
  SITE_ENGINEER: ['org.read', 'projects.read', 'files.read', 'files.write'],
  LEGAL_OFFICER: ['org.read', 'projects.read', 'files.read', 'files.write'],
  VIEWER: ['org.read', 'projects.read', 'files.read'],
};

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

export function createPromoGestDevApiPlugin(): Plugin {
  let organization: OrganizationSummary | null = null;
  let initializedAtUtc: string | null = null;
  const users: StoredUserRecord[] = [];
  const sessions: StoredSession[] = [];
  const projects: ProjectDto[] = [];
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

  function toPublicUser(u: StoredUserRecord): UserDto {
    const { passwordHash: _ph, securityStamp: _ss, ...rest } = u;
    return rest;
  }

  function getAuthenticatedSession(req: IncomingMessage): { user: StoredUserRecord; sessionHash: string } | null {
    const cookies = parseCookies(req);
    const raw = cookies[COOKIE_NAME];
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
  function ensurePreviewDemoData(): StoredUserRecord {
    if (organization) {
      const existingAdmin = users.find((user) => user.isSystemAdministrator);
      if (existingAdmin) return existingAdmin;
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
    initializedAtUtc = nowIso;

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

    projects.push(
      {
        id: '30000000-0000-0000-0000-000000000003',
        code: 'DEMO-ORAN-001',
        nameAr: 'إقامة النخيل التجريبية',
        nameFr: 'Résidence Ennahil (démo)',
        wilayaCode: '31',
        wilayaName: 'وهران / Oran',
        municipality: 'بئر الجير / Bir El Djir',
        address: 'عنوان افتراضي — وهران',
        landTitleReference: 'DEMO-LAND-001',
        buildingPermitNumber: 'DEMO-PERMIT-001',
        buildingPermitDate: '2026-05-15',
        status: 'UnderConstruction',
        estimatedBudgetDzd: 1250000000,
        plannedBlocksCount: 4,
        plannedUnitsCount: 180,
        createdAtUtc: nowIso,
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
        createdAtUtc: nowIso,
        members: [],
      }
    );

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

  return {
    name: 'promogest-dev-api-contract',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
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
            databaseConnected: true,
            isInitialized: Boolean(organization),
            timestampUtc: new Date().toISOString(),
            environmentMode: 'ViteDevContractPreview',
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
            initializedAtUtc,
          });
        }

        // Vite-preview-only demo access. This route does not exist in the production ASP.NET Core API.
        // GET is intentional here because some embedded preview hosts block state-changing requests.
        if (method === 'GET' && pathname === '/api/auth/preview-session') {
          const demoAdmin = ensurePreviewDemoData();
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

          const nowIso = new Date().toISOString();
          initializedAtUtc = nowIso;
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
          const raw = cookies[COOKIE_NAME];
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
          target.passwordHash = hashPassword(body.newPassword);
          target.securityStamp = crypto.randomUUID();
          addAudit('USER_PASSWORD_RESET', 'Security', `Reset password for '${target.username}'.`, currentUser, 'User', target.id);
          res.statusCode = 204;
          res.end();
          return;
        }

        // Projects & Project-level authorization
        if (method === 'GET' && pathname === '/api/projects') {
          const visible = currentUser.isSystemAdministrator
            ? projects
            : projects.filter((p) => p.members.some((m) => m.userId === currentUser.id));
          return sendJson(res, 200, visible);
        }

        if (method === 'POST' && pathname === '/api/projects') {
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('projects.create')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized project creation.`, currentUser, 'Project');
            return sendJson(res, 403, { code: 'FORBIDDEN_PROJECT_CREATE', message: 'Forbidden.' });
          }
          const body = await readJsonBody<any>(req);
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
            createdAtUtc: new Date().toISOString(),
            members: [],
          };
          projects.unshift(created);
          addAudit('PROJECT_CREATED', 'Info', `Created project '${created.code}' (${created.nameFr}).`, currentUser, 'Project', created.id);
          return sendJson(res, 201, created);
        }

        const projectDetailMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
        if (method === 'GET' && projectDetailMatch) {
          const projectId = projectDetailMatch[1];
          const project = projects.find((p) => p.id === projectId);
          if (!currentUser.isSystemAdministrator && (!project || !project.members.some((m) => m.userId === currentUser.id))) {
            addAudit('ACCESS_DENIED', 'Security', `Unauthorized project access attempt by '${currentUser.username}' on '${projectId}'.`, currentUser, 'Project', projectId);
            return sendJson(res, 403, { code: 'PROJECT_ACCESS_DENIED', message: 'Project access denied.' });
          }
          if (!project) return sendJson(res, 404, { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
          return sendJson(res, 200, project);
        }

        const projectMembersMatch = pathname.match(/^\/api\/projects\/([^/]+)\/members$/);
        if (method === 'PUT' && projectMembersMatch) {
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('projects.access.manage')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized project membership assignment.`, currentUser, 'Project', projectMembersMatch[1]);
            return sendJson(res, 403, { code: 'FORBIDDEN_PROJECT_ACCESS_ADMIN', message: 'Forbidden.' });
          }
          const project = projects.find((p) => p.id === projectMembersMatch[1]);
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
          const existingIdx = project.members.findIndex((m) => m.userId === target.id);
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
          else project.members.push(memberRecord);
          addAudit('PROJECT_MEMBER_ASSIGNED', 'Security', `Assigned '${target.username}' to '${project.code}' (${body.roleInProject}).`, currentUser, 'Project', project.id);
          return sendJson(res, 200, project);
        }

        const removeMemberMatch = pathname.match(/^\/api\/projects\/([^/]+)\/members\/([^/]+)$/);
        if (method === 'DELETE' && removeMemberMatch) {
          if (!currentUser.isSystemAdministrator && !getPermissions(currentUser).includes('projects.access.manage')) {
            addAudit('ACCESS_DENIED', 'Security', `User '${currentUser.username}' attempted unauthorized project membership revocation.`, currentUser, 'Project', removeMemberMatch[1]);
            return sendJson(res, 403, { code: 'FORBIDDEN_PROJECT_ACCESS_ADMIN', message: 'Forbidden.' });
          }
          const project = projects.find((p) => p.id === removeMemberMatch[1]);
          if (!project) return sendJson(res, 404, { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' });
          project.members = project.members.filter((m) => m.userId !== removeMemberMatch[2]);
          addAudit('PROJECT_MEMBER_REVOKED', 'Security', `Revoked access on '${project.code}' for user '${removeMemberMatch[2]}'.`, currentUser, 'Project', project.id);
          return sendJson(res, 200, project);
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
      });
    },
  };
}
