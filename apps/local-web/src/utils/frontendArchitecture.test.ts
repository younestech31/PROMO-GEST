import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ApiError } from '../core/api/apiClient';
import { ERP_MODULE_REGISTRY } from '../core/modules/registry';
import { ERP_MODULE_CATALOG } from './moduleCatalog';
import { canManageOrganizationProfile } from '../core/permissions/permissionPolicy';
import type { AuthenticatedUser } from '../types/erp';
import { reportingApi } from '../modules/module-l-reporting';
import { contractsApi } from '../modules/module-f-contracts';
import { financeApi } from '../modules/module-g-finance';
import { constructionApi } from '../modules/module-h-construction';
import { procurementApi } from '../modules/module-i-procurement';
import { accountingApi } from '../modules/module-j-accounting';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '..');
const modulesRoot = path.join(srcRoot, 'modules');

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function moduleSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const declarations = source.matchAll(/^\s*(?:import|export)\b[\s\S]*?;/gm);

  for (const declaration of declarations) {
    const from = declaration[0].match(/\bfrom\s*['"]([^'"]+)['"]/);
    if (from) {
      specifiers.push(from[1]);
      continue;
    }
    const sideEffect = declaration[0].match(/^\s*import\s*['"]([^'"]+)['"]/);
    if (sideEffect) specifiers.push(sideEffect[1]);
  }

  for (const dynamicImport of source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    specifiers.push(dynamicImport[1]);
  }

  return specifiers;
}

function resolveLocalImport(fromFile: string, specifier: string): string | null {
  let basePath: string;
  if (specifier.startsWith('@/')) {
    basePath = path.resolve(srcRoot, specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    basePath = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return null;
  }

  const candidates = [
    basePath,
    basePath + '.ts',
    basePath + '.tsx',
    basePath + '.d.ts',
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ];
  return candidates.find((candidate) => {
    if (!fs.existsSync(candidate)) return false;
    return fs.statSync(candidate).isFile();
  }) ?? null;
}

function owningModule(filePath: string): string | null {
  const relative = path.relative(modulesRoot, filePath);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) return null;
  const owner = relative.split(path.sep)[0];
  return fs.existsSync(path.join(modulesRoot, owner, 'index.ts')) ? owner : null;
}

function findCycle(graph: Map<string, Set<string>>): string[] | null {
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];

  const visit = (node: string): string[] | null => {
    if (active.has(node)) {
      const start = stack.indexOf(node);
      return [...stack.slice(start), node];
    }
    if (visited.has(node)) return null;

    visited.add(node);
    active.add(node);
    stack.push(node);

    for (const next of graph.get(node) ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }

    stack.pop();
    active.delete(node);
    return null;
  };

  for (const node of graph.keys()) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return null;
}

test('moduleSpecifiers detects named, type-only, re-export, side-effect and dynamic imports', () => {
  const fixture = [
    "import value from '@/modules/module-a-organization';",
    "import type { ProjectDto } from '../types/erp';",
    "export { projectsApi } from './api/projectsApi';",
    "import '../styles/theme.css';",
    "void import('../lazy/LazyView');",
  ].join('\n');

  assert.deepEqual(moduleSpecifiers(fixture), [
    '@/modules/module-a-organization',
    '../types/erp',
    './api/projectsApi',
    '../styles/theme.css',
    '../lazy/LazyView',
  ]);
});

test('the modular frontend has one canonical registry and complete unique module ownership A-L', () => {
  assert.equal(ERP_MODULE_CATALOG, ERP_MODULE_REGISTRY);
  assert.deepEqual(ERP_MODULE_REGISTRY.map((module) => module.code), [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  ]);

  const owners = ERP_MODULE_REGISTRY.map((module) => module.ownerModuleDir);
  assert.equal(new Set(owners).size, owners.length, 'each ERP capability must have one owner directory');

  for (const module of ERP_MODULE_REGISTRY) {
    const moduleRoot = path.join(srcRoot, module.ownerModuleDir);
    const indexPath = path.join(moduleRoot, 'index.ts');
    assert.ok(fs.existsSync(moduleRoot), 'missing module root for ' + module.code);
    assert.ok(fs.existsSync(indexPath), 'missing public entry point for ' + module.code);
    assert.ok(module.subScreens.length > 0, 'module ' + module.code + ' has no declared screens');
    assert.equal(
      new Set(module.subScreens.map((screen) => screen.id)).size,
      module.subScreens.length,
      'duplicate sub-screen ID in module ' + module.code
    );

    const indexSource = fs.readFileSync(indexPath, 'utf8');
    assert.equal(indexSource.includes('@/features/'), false, module.code + ' still delegates ownership to legacy features/');
    for (const specifier of moduleSpecifiers(indexSource)) {
      const target = resolveLocalImport(indexPath, specifier);
      if (!target) continue;
      const fromModuleRoot = path.relative(moduleRoot, target);
      assert.ok(
        fromModuleRoot === '' || (!fromModuleRoot.startsWith('..') && !path.isAbsolute(fromModuleRoot)),
        module.code + ' public index exports outside its owning module: ' + specifier
      );
    }
  }
});

test('module boundaries use public index files only and the inter-module dependency graph is acyclic', () => {
  const files = walk(srcRoot).filter((file) => /\.(ts|tsx)$/.test(file));
  const graph = new Map<string, Set<string>>();
  const privateImports: string[] = [];
  const legacyFeatureImports: string[] = [];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const owner = owningModule(file);

    for (const specifier of moduleSpecifiers(source)) {
      const target = resolveLocalImport(file, specifier);
      if (!target) continue;

      const targetOwner = owningModule(target);
      if (!targetOwner) {
        const targetRelative = path.relative(srcRoot, target);
        if (
          targetRelative.startsWith('features' + path.sep) &&
          !file.includes(path.sep + 'features' + path.sep)
        ) {
          legacyFeatureImports.push(path.relative(srcRoot, file) + ' -> ' + specifier);
        }
        continue;
      }

      if (owner === targetOwner) continue;

      const expectedPublicIndex = path.join(modulesRoot, targetOwner, 'index.ts');
      if (target !== expectedPublicIndex) {
        privateImports.push(path.relative(srcRoot, file) + ' -> ' + specifier);
      }
      if (owner) {
        if (!graph.has(owner)) graph.set(owner, new Set());
        graph.get(owner)!.add(targetOwner);
      }
    }
  }

  assert.deepEqual(privateImports, [], 'cross-module imports must target the owning module index only');
  assert.deepEqual(legacyFeatureImports, [], 'active application/module code must not import from legacy features/');
  const cycle = findCycle(graph);
  assert.equal(cycle, null, cycle ? 'circular module dependency: ' + cycle.join(' -> ') : undefined);
});

test('API, CSRF, permission, route parsing, localization and shared utilities each have one implementation', () => {
  const files = walk(srcRoot).filter((file) => /\.(ts|tsx)$/.test(file));
  const sources = files.map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));

  assert.equal(sources.filter(({ text }) => /export const apiClient\s*=/.test(text)).length, 1);
  assert.equal(sources.filter(({ text }) => /export function parseCookieValue\(/.test(text)).length, 1);
  assert.equal(sources.filter(({ text }) => /export function parseAppLocation\(/.test(text)).length, 1);
  assert.equal(sources.filter(({ text }) => /export function getTranslations\(/.test(text)).length, 1);
  assert.equal(sources.filter(({ text }) => /export function formatDzd\(/.test(text)).length, 1);
  assert.equal(sources.filter(({ text }) => /export function validateSetupRequest\(/.test(text)).length, 1);

  const singleOwnerImplementations = [
    /export function FormField\(/,
    /export function LanguageSwitcher\(/,
    /export function ModuleStateTag\(/,
    /export function PageHeader\(/,
    /export function ProjectIdentityStrip\(/,
    /export function ProjectSwitcherModal\(/,
    /export function LoadingSkeleton\(/,
    /export function EmptyState\(/,
    /export function ErrorBanner\(/,
    /export function ConfirmDialog\(/,
    /export function Modal\(/,
    /export function PlannedModuleShell\(/,
    /export function PlannedModuleWorkspace\(/,
    /export function ErpShellLayout\(/,
  ];

  for (const pattern of singleOwnerImplementations) {
    assert.equal(
      sources.filter(({ text }) => pattern.test(text)).length,
      1,
      'shared implementation must have exactly one owner: ' + pattern
    );
  }

  const adapters: Array<[string, string]> = [
    ['services/apiClient.ts', '../core/api/apiClient'],
    ['utils/csrf.ts', '../core/api/csrf'],
    ['shared/utils/csrf.ts', '../../core/api/csrf'],
    ['utils/permissions.ts', '../core/permissions/permissionPolicy'],
    ['utils/moduleCatalog.ts', '../core/modules/registry'],
    ['utils/navigation.ts', '../app/routeRegistry'],
    ['localization/translations.ts', '../core/localization/translations'],
    ['utils/algerianFormat.ts', '../shared/utils/algerianFormat'],
    ['utils/validation.ts', '../shared/utils/validation'],
    ['components/FormField.tsx', '../shared/components/FormField'],
    ['components/LanguageSwitcher.tsx', '../shared/components/LanguageSwitcher'],
    ['components/PageHeader.tsx', '../shared/components/PageHeader'],
    ['components/ProjectIdentityStrip.tsx', '../shared/components/ProjectIdentityStrip'],
    ['components/StateViews.tsx', '../shared/components/StateViews'],
    ['components/ProjectSwitcherModal.tsx', '../modules/module-b-projects'],
    ['layouts/ErpShellLayout.tsx', '../app/ErpShellLayout'],
    ['hooks/useAdministrativeReference.ts', '../modules/module-a-organization'],
  ];

  for (const [file, requiredImport] of adapters) {
    const adapter = fs.readFileSync(path.join(srcRoot, file), 'utf8');
    assert.ok(adapter.includes(requiredImport), file + ' is not a compatibility adapter to ' + requiredImport);
  }
});

test('shared UI is the active import surface and root components contain no second implementations', () => {
  const files = walk(srcRoot).filter((file) => /\.(ts|tsx)$/.test(file));
  const activeRootImports: string[] = [];

  for (const file of files) {
    const rootComponents = path.join(srcRoot, 'components') + path.sep;
    const sharedComponents = path.join(srcRoot, 'shared', 'components') + path.sep;
    if (file.startsWith(rootComponents) || file.startsWith(sharedComponents)) continue;
    if (file.includes(path.sep + 'features' + path.sep) || file.includes(path.sep + 'layouts' + path.sep)) continue;

    const source = fs.readFileSync(file, 'utf8');
    for (const specifier of moduleSpecifiers(source)) {
      if (specifier.startsWith('@/components/')) {
        activeRootImports.push(path.relative(srcRoot, file) + ' -> ' + specifier);
      }
    }
  }

  assert.deepEqual(activeRootImports, [], 'active screens must import reusable UI from shared/components');
});

test('planned F-J workflow metadata is not stored in API modules', () => {
  const moduleDirs = [
    'module-f-contracts', 'module-g-finance', 'module-h-construction',
    'module-i-procurement', 'module-j-accounting',
  ];

  for (const moduleDir of moduleDirs) {
    const moduleRoot = path.join(srcRoot, 'modules', moduleDir);
    assert.ok(fs.existsSync(path.join(moduleRoot, 'presentation', 'workflows.ts')));
    const apiDirectory = path.join(moduleRoot, 'api');
    for (const file of fs.readdirSync(apiDirectory).filter((name) => name.endsWith('.ts'))) {
      const source = fs.readFileSync(path.join(apiDirectory, file), 'utf8');
      assert.equal(/_SUB_WORKFLOWS/.test(source), false, moduleDir + '/api/' + file + ' contains presentation metadata');
    }
  }
});

test('organization profile edit visibility uses the canonical org.manage permission', () => {
  const createUser = (
    permissions: string[],
    isSystemAdministrator = false
  ): AuthenticatedUser => ({
    id: 'organization-editor',
    username: 'organization.editor',
    fullName: 'Organization Editor',
    email: 'organization.editor@example.test',
    phone: null,
    isSystemAdministrator,
    isActive: true,
    preferredLanguage: 'ar',
    concurrencyStamp: '00000000-0000-0000-0000-000000000001',
    roles: ['COMMERCIAL_MANAGER'],
    permissions,
    lastLoginAtUtc: null,
    mustChangePasswordAtNextLogin: false,
    passwordChangeRequiredUntilUtc: null,
  });

  assert.equal(canManageOrganizationProfile(createUser(['org.read', 'org.manage'])), true);
  assert.equal(canManageOrganizationProfile(createUser(['org.read'])), false);
  assert.equal(canManageOrganizationProfile(createUser(['organization.manage'])), false);
  assert.equal(canManageOrganizationProfile(createUser([], true)), true);

  const appSource = fs.readFileSync(path.join(srcRoot, 'app', 'App.tsx'), 'utf8');
  const permissionSource = fs.readFileSync(
    path.join(srcRoot, 'core', 'permissions', 'permissionPolicy.ts'),
    'utf8'
  );
  const previewSource = fs.readFileSync(path.resolve(srcRoot, '..', 'dev-api-middleware.ts'), 'utf8');
  const moduleA = ERP_MODULE_REGISTRY.find((module) => module.code === 'A');

  assert.match(appSource, /canManage=\{canManageOrganizationProfile\(session\.user\)\}/);
  assert.doesNotMatch(appSource, /organization\.manage/);
  assert.match(permissionSource, /hasPermission\(user,\s*'org\.manage'\)/);
  assert.doesNotMatch(permissionSource, /organization\.manage/);
  assert.deepEqual(moduleA?.requiredPermissions, ['org.read', 'org.manage', 'users.manage']);

  const rolePermsBlock = previewSource.match(
    /const ROLE_PERMS: Record<string, string\[]> = \{([\s\S]*?)\n\};/
  )?.[1];
  assert.ok(rolePermsBlock, 'Vite preview role permission catalogue is missing');
  const systemAdminPermissions = rolePermsBlock.match(/SYSTEM_ADMIN:\s*\[([\s\S]*?)\],/)?.[1];
  assert.ok(systemAdminPermissions?.includes("'org.manage'"), 'preview SYSTEM_ADMIN must retain org.manage');
  const nonAdminRolePermissions = rolePermsBlock.replace(/SYSTEM_ADMIN:\s*\[[\s\S]*?\],/, '');
  assert.doesNotMatch(nonAdminRolePermissions, /['"]org\.manage['"]/);
  assert.doesNotMatch(rolePermsBlock, /organization\.manage|organization\.read/);
});

test('planned endpoints reject explicitly instead of reporting fake successful data', () => {
  const cases = [
    () => reportingApi.listReports('organization'),
    () => contractsApi.listContracts('project-1'),
    () => financeApi.listFinance('project-1'),
    () => constructionApi.listConstruction('project-1'),
    () => procurementApi.listProcurement('project-1'),
    () => accountingApi.listAccounting('project-1'),
  ];

  for (const invoke of cases) {
    assert.throws(invoke, (error) => error instanceof ApiError && error.code === 'MODULE_PLANNED');
  }
});

test('all modal dialogs delegate aria dialog semantics to shared/components/Modal.tsx', () => {
  const modalPath = path.join(srcRoot, 'shared', 'components', 'Modal.tsx');
  const files = walk(srcRoot).filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'));
  const offenders: string[] = [];

  for (const file of files) {
    if (file === modalPath) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (/role=["']dialog["']/.test(content)) {
      offenders.push(path.relative(srcRoot, file));
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `dialogs must use shared/components/Modal.tsx instead of raw role="dialog": ${offenders.join(', ')}`,
  );
});
