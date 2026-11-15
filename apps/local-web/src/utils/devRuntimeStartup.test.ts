import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const launcherPath = new URL('../../../../scripts/dev-with-local-api.sh', import.meta.url);
const launcher = readFileSync(launcherPath, 'utf8');
const rootVite = readSource('../../../../vite.config.ts');
const appVite = readSource('../../vite.config.ts');

test('development launcher has valid Bash syntax', () => {
  const result = spawnSync('bash', ['-n', fileURLToPath(launcherPath)], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('a configured local API must pass readiness before Vite starts', () => {
  const apiReadinessGate = launcher.indexOf('if [[ "$api_ready" != true ]]');
  const viteStart = launcher.indexOf('"$ROOT_DIR/node_modules/.bin/vite"');
  assert.ok(apiReadinessGate >= 0, 'launcher must have a fatal API readiness gate');
  assert.ok(viteStart > apiReadinessGate, 'Vite must not start before the API readiness gate');
  assert.match(launcher, /Vite was not started/);
});

test('the verified API target is exported to Vite after readiness', () => {
  assert.match(launcher, /export ASPNETCORE_URL="\$API_URL"/);
  assert.match(launcher, /API readiness verified/);
});

test('an API child-process exit also stops the Vite proxy process', () => {
  assert.match(launcher, /while kill -0 "\$VITE_PID"/);
  assert.match(launcher, /PromoGest\.Api stopped while Vite was running/);
  assert.match(launcher, /kill "\$VITE_PID"/);
});

test('Vite-only mode explicitly bypasses any inherited ASPNETCORE_URL proxy target', () => {
  assert.match(launcher, /PROMOGEST_VITE_ONLY/);
  assert.match(launcher, /export PROMOGEST_VITE_ONLY=0/);
  for (const config of [rootVite, appVite]) {
    assert.match(config, /viteOnlyPreview/);
    assert.match(config, /process\.env\.PROMOGEST_VITE_ONLY \?\? env\.PROMOGEST_VITE_ONLY/);
    assert.match(config, /viteOnlyPreview \? undefined/);
    assert.match(config, /createPromoGestDevApiPlugin/);
  }
});
