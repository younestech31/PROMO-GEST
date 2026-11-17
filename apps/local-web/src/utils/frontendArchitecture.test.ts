import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ApiError } from '../core/api/apiClient';
import { ERP_MODULE_REGISTRY } from '../core/modules/registry';
import { ERP_MODULE_CATALOG } from './moduleCatalog';
import { reportingApi } from '../modules/module-l-reporting/api/reportingApi';
import { contractsApi } from '../modules/module-f-contracts/api/contractsApi';
import { financeApi } from '../modules/module-g-finance/api/financeApi';
import { constructionApi } from '../modules/module-h-construction/api/constructionApi';
import { procurementApi } from '../modules/module-i-procurement/api/procurementApi';
import { accountingApi } from '../modules/module-j-accounting/api/accountingApi';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '..');

function walk(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

test('the modular frontend has one canonical registry and public module entry points A-L', () => {
  assert.equal(ERP_MODULE_CATALOG, ERP_MODULE_REGISTRY);
  assert.deepEqual(ERP_MODULE_REGISTRY.map((module) => module.code), [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
  ]);

  const owners = ERP_MODULE_REGISTRY.map((module) => module.ownerModuleDir);
  assert.equal(new Set(owners).size, owners.length, 'each module must have one unique owner directory');

  for (const module of ERP_MODULE_REGISTRY) {
    const moduleRoot = path.join(srcRoot, module.ownerModuleDir);
    assert.ok(fs.existsSync(moduleRoot), 'missing module root for ' + module.code);
    assert.ok(fs.existsSync(path.join(moduleRoot, 'index.ts')), 'missing public entry point for ' + module.code);
    assert.ok(module.subScreens.length > 0, 'module ' + module.code + ' has no declared screens');
    assert.equal(
      new Set(module.subScreens.map((screen) => screen.id)).size,
      module.subScreens.length,
      'duplicate sub-screen ID in module ' + module.code
    );
  }
});

test('API, CSRF, route parsing and localization each have one implementation; old paths are adapters', () => {
  const files = walk(srcRoot).filter((file) => /\.(ts|tsx)$/.test(file));
  const sources = files.map((file) => ({ file, text: fs.readFileSync(file, 'utf8') }));

  assert.equal(sources.filter(({ text }) => /export const apiClient\s*=/.test(text)).length, 1);
  assert.equal(sources.filter(({ text }) => /export function parseCookieValue\(/.test(text)).length, 1);
  assert.equal(sources.filter(({ text }) => /export function parseAppLocation\(/.test(text)).length, 1);
  assert.equal(sources.filter(({ text }) => /export function getTranslations\(/.test(text)).length, 1);

  for (const [file, requiredImport] of [
    ['services/apiClient.ts', '../core/api/apiClient'],
    ['utils/csrf.ts', '../core/api/csrf'],
    ['shared/utils/csrf.ts', '../../core/api/csrf'],
    ['utils/permissions.ts', '../core/permissions/permissionPolicy'],
    ['utils/moduleCatalog.ts', '../core/modules/registry'],
    ['utils/navigation.ts', '../app/routeRegistry'],
    ['localization/translations.ts', '../core/localization/translations'],
  ] as const) {
    const adapter = fs.readFileSync(path.join(srcRoot, file), 'utf8');
    assert.ok(adapter.includes(requiredImport), file + ' is not a compatibility adapter to ' + requiredImport);
  }
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
