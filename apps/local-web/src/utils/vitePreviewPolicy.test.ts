import assert from 'node:assert/strict';
import test from 'node:test';
import { readRequestedViteHost, resolveVitePreviewPolicy } from '../vitePreviewPolicy';

test('real ASP.NET Core API mode uses loopback and never registers the preview simulator', () => {
  assert.deepEqual(
    resolveVitePreviewPolicy({
      command: 'serve',
      apiUrl: 'http://127.0.0.1:5055',
      viteOnlyPreview: false,
      allowExternalPreview: false,
    }),
    {
      previewEnabled: false,
      apiTarget: 'http://127.0.0.1:5055',
      host: '127.0.0.1',
    }
  );
});

test('Vite-only simulation requires an explicit opt-in and excludes an API target', () => {
  assert.throws(
    () => resolveVitePreviewPolicy({
      command: 'serve',
      viteOnlyPreview: false,
      allowExternalPreview: false,
    }),
    /PROMOGEST_VITE_ONLY=1/
  );
  assert.throws(
    () => resolveVitePreviewPolicy({
      command: 'serve',
      apiUrl: 'http://127.0.0.1:5055',
      viteOnlyPreview: true,
      allowExternalPreview: false,
    }),
    /cannot be combined/
  );
  assert.deepEqual(
    resolveVitePreviewPolicy({
      command: 'serve',
      viteOnlyPreview: true,
      allowExternalPreview: false,
    }),
    {
      previewEnabled: true,
      apiTarget: undefined,
      host: '127.0.0.1',
    }
  );
});

test('external CLI host overrides are rejected unless external preview is explicitly enabled', () => {
  assert.equal(readRequestedViteHost(['node', 'vite', '--host=0.0.0.0']), '0.0.0.0');
  assert.equal(readRequestedViteHost(['node', 'vite', '--host', '127.0.0.1']), '127.0.0.1');
  assert.equal(readRequestedViteHost(['node', 'vite', '--host']), 'true');
  assert.throws(
    () => resolveVitePreviewPolicy({
      command: 'serve',
      viteOnlyPreview: true,
      allowExternalPreview: false,
      requestedHost: '0.0.0.0',
    }),
    /External Vite binding/
  );
});

test('external preview requires exact non-wildcard host and origin allowlists', () => {
  const policy = resolveVitePreviewPolicy({
    command: 'serve',
    viteOnlyPreview: true,
    allowExternalPreview: true,
    allowedHosts: 'preview.example.test,127.0.0.1',
    allowedOrigins: 'https://preview.example.test,http://localhost:3000',
  });
  assert.equal(policy.host, '0.0.0.0');
  assert.deepEqual(policy.allowedHosts, ['preview.example.test', '127.0.0.1']);
  assert.deepEqual(policy.allowedOrigins, ['https://preview.example.test', 'http://localhost:3000']);

  assert.throws(
    () => resolveVitePreviewPolicy({
      command: 'serve',
      viteOnlyPreview: true,
      allowExternalPreview: true,
      allowedHosts: '*',
      allowedOrigins: 'https://preview.example.test',
    }),
    /wildcards are forbidden/
  );
  assert.throws(
    () => resolveVitePreviewPolicy({
      command: 'serve',
      viteOnlyPreview: true,
      allowExternalPreview: true,
      allowedHosts: 'preview.example.test',
      allowedOrigins: '*',
    }),
    /Invalid PROMOGEST_VITE_ALLOWED_ORIGINS/
  );
});
