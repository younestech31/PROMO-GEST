import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  ERP_MODULE_CATALOG,
  getModuleDefinition,
  getModuleStateLabel,
  type ModuleImplementationState,
} from './moduleCatalog';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CANONICAL_STATES = new Set<ModuleImplementationState>([
  'IMPLEMENTED_AND_VERIFIED',
  'IMPLEMENTED_NOT_VERIFIED',
  'PARTIALLY_IMPLEMENTED',
  'PLANNED',
  'BLOCKED',
  'DEPRECATED',
]);

test('module catalog covers every ERP module A through L with bilingual copy and canonical 6-state taxonomy', () => {
  const codes = ERP_MODULE_CATALOG.map((m) => m.code);
  assert.deepEqual(codes, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);

  for (const mod of ERP_MODULE_CATALOG) {
    assert.ok(CANONICAL_STATES.has(mod.state), `Non-canonical state on module ${mod.code}: ${mod.state}`);
    assert.ok(mod.title.ar.trim().length > 0);
    assert.ok(mod.title.fr.trim().length > 0);
    assert.ok(mod.summary.ar.trim().length > 0);
    assert.ok(mod.summary.fr.trim().length > 0);
    assert.ok(mod.subScreens.length >= 3);

    for (const sub of mod.subScreens) {
      assert.ok(CANONICAL_STATES.has(sub.state), `Non-canonical state on ${mod.code}/${sub.id}: ${sub.state}`);
      assert.ok(sub.label.ar.trim().length > 0);
      assert.ok(sub.label.fr.trim().length > 0);
    }
  }
});

test('planned modules F–J have expected sub-screens, distinct columns/actions, and zero unapproved tax rates', () => {
  const expectedCounts: Record<'F' | 'G' | 'H' | 'I' | 'J', number> = {
    F: 6,
    G: 6,
    H: 6,
    I: 6,
    J: 5,
  };

  for (const code of ['F', 'G', 'H', 'I', 'J'] as const) {
    const mod = getModuleDefinition(code);
    assert.equal(mod.state, 'PLANNED');
    assert.equal(mod.subScreens.length, expectedCounts[code], `Module ${code} sub-screen count mismatch`);
    assert.ok(mod.prerequisites?.ar);
    assert.ok(mod.prerequisites?.fr);
    assert.equal(getModuleStateLabel(mod.state, 'fr'), 'Planifié / En préparation');

    for (const sub of mod.subScreens) {
      assert.equal(sub.state, 'PLANNED');
      assert.ok(sub.description?.ar && sub.description?.fr, `${code}/${sub.id} missing description`);
      assert.ok(Array.isArray(sub.columns) && sub.columns.length >= 4, `${code}/${sub.id} missing tailored columns`);
      assert.ok(
        Array.isArray(sub.disabledActions) && sub.disabledActions.length >= 1,
        `${code}/${sub.id} missing explicit disabled planned actions`
      );
    }
  }

  const catalogSource = fs.readFileSync(path.resolve(__dirname, 'moduleCatalog.ts'), 'utf8');
  const plannedViewSource = fs.readFileSync(
    path.resolve(__dirname, '../features/projects/PlannedProjectModuleView.tsx'),
    'utf8'
  );
  assert.equal(/\b(9|19)\s*%/.test(catalogSource), false, 'Unapproved tax rate literal found in moduleCatalog.ts');
  assert.equal(
    /\b(9|19)\s*%/.test(plannedViewSource),
    false,
    'Unapproved tax rate literal found in PlannedProjectModuleView.tsx'
  );
});

test('Module K lifecycle accurately separates active upload/list/download from planned metadata/soft-archive/DocumentLink/K-Full', () => {
  const modK = getModuleDefinition('K');
  assert.equal(modK.state, 'PARTIALLY_IMPLEMENTED');
  assert.equal(modK.subScreens.find((s) => s.id === 'vault')?.state, 'IMPLEMENTED_AND_VERIFIED');
  assert.equal(modK.subScreens.find((s) => s.id === 'metadata')?.state, 'PLANNED');
  assert.equal(modK.subScreens.find((s) => s.id === 'links')?.state, 'PLANNED');
  assert.equal(modK.subScreens.find((s) => s.id === 'retention')?.state, 'PLANNED');
});
