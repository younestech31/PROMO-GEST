import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const launcherPath = new URL('../../../../scripts/dev-with-local-api.sh', import.meta.url);
const launcher = readFileSync(launcherPath, 'utf8');
const rootVite = readSource('../../../../vite.config.ts');
const appVite = readSource('../../vite.config.ts');
const bootstrapPath = new URL('../../../../scripts/ensure-dotnet10.sh', import.meta.url);
const bootstrap = readFileSync(bootstrapPath, 'utf8');
const cloudSqlRunner = readSource('../../../../scripts/run-ai-studio-cloudsql.sh');

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

test('the .NET bootstrap and both API launchers have valid Bash syntax', () => {
  const paths = [
    bootstrapPath,
    new URL('../../../../scripts/dev-with-local-api.sh', import.meta.url),
    new URL('../../../../scripts/run-ai-studio-cloudsql.sh', import.meta.url),
  ];
  for (const path of paths) {
    const result = spawnSync('bash', ['-n', fileURLToPath(path)], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${fileURLToPath(path)}: ${result.stderr}`);
  }
});

test('both real-API launchers invoke the shared .NET 10 bootstrap', () => {
  assert.match(launcher, /source "\$ROOT_DIR\/scripts\/ensure-dotnet10\.sh"/);
  assert.match(launcher, /promogest_ensure_dotnet10/);
  assert.match(cloudSqlRunner, /source "\$ROOT_DIR\/scripts\/ensure-dotnet10\.sh"/);
  assert.match(cloudSqlRunner, /promogest_ensure_dotnet10/);
});

test('the shared bootstrap installs the supported .NET 10 SDK per-user using Microsoft dotnet-install', () => {
  assert.match(bootstrap, /https:\/\/dot\.net\/v1\/dotnet-install\.sh/);
  assert.match(bootstrap, /--channel 10\.0/);
  assert.match(bootstrap, /--install-dir "\$install_dir"/);
  assert.match(bootstrap, /export DOTNET_ROOT="\$install_dir"/);
  assert.match(bootstrap, /--no-path/);
});

test('the shared bootstrap can provision .NET 10 when the preview has no SDK', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'promogest-dotnet-bootstrap-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));

  const mockBin = join(home, 'mock-bin');
  mkdirSync(mockBin, { recursive: true });
  const curlPath = join(mockBin, 'curl');
  writeFileSync(curlPath, `#!/usr/bin/env bash
set -euo pipefail
output=""
while [[ "$#" -gt 0 ]]; do
  if [[ "$1" == "--output" ]]; then
    shift
    output="$1"
  fi
  shift
done
cat > "$output" <<'INSTALLER'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$HOME/.dotnet"
cat > "$HOME/.dotnet/dotnet" <<'DOTNET'
#!/usr/bin/env bash
if [[ "${1:-}" == "--version" ]]; then
  echo "10.0.100"
  exit 0
fi
if [[ "${1:-}" == "--list-sdks" ]]; then
  echo "10.0.100 [mock-sdk-path]"
  exit 0
fi
exit 0
DOTNET
chmod +x "$HOME/.dotnet/dotnet"
INSTALLER
`);
  chmodSync(curlPath, 0o755);

  const result = spawnSync(
    'bash',
    ['-c', 'source "$1"; promogest_ensure_dotnet10', 'bootstrap-test', fileURLToPath(bootstrapPath)],
    {
      encoding: 'utf8',
      timeout: 15000,
      env: {
        ...process.env,
        HOME: home,
        PATH: `${mockBin}:/usr/bin:/bin`,
      },
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /\.NET 10 SDK 10\.0\.100 is ready/);
  assert.equal(readFileSync(join(home, '.dotnet', 'dotnet'), 'utf8').includes('10.0.100'), true);
});
