import assert from 'node:assert/strict';
import test from 'node:test';
import { ERP_MODULE_CATALOG, getModuleDefinition, getModuleStateLabel } from './moduleCatalog';

test('module catalog covers every ERP module A through L with bilingual copy', () => {
  const codes = ERP_MODULE_CATALOG.map((m) => m.code);
  assert.deepEqual(codes, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);

  for (const mod of ERP_MODULE_CATALOG) {
    assert.ok(mod.title.ar.trim().length > 0);
    assert.ok(mod.title.fr.trim().length > 0);
    assert.ok(mod.summary.ar.trim().length > 0);
    assert.ok(mod.summary.fr.trim().length > 0);
    assert.ok(mod.subScreens.length >= 3);
  }
});

test('planned modules F–J are explicitly marked PLANNED with non-empty prerequisite notices', () => {
  for (const code of ['F', 'G', 'H', 'I', 'J'] as const) {
    const mod = getModuleDefinition(code);
    assert.equal(mod.state, 'PLANNED');
    assert.ok(mod.prerequisites?.ar);
    assert.ok(mod.prerequisites?.fr);
    assert.equal(getModuleStateLabel(mod.state, 'fr'), 'Planifié / En préparation');
  }
});
