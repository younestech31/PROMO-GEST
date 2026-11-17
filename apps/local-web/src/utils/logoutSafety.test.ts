import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8');

const app = readSource('../app/App.tsx');
const apiClient = readSource('../core/api/apiClient.ts');

test('logout clears application state only after 204 or a server-confirmed 401 session check', () => {
  const start = app.indexOf('const performLogout = useCallback');
  assert.notEqual(start, -1);
  const end = app.indexOf('\n  }, [clearLocalSession]);', start);
  assert.notEqual(end, -1);
  const performLogout = app.slice(start, end);

  assert.match(performLogout, /await authApi\.logout\(\);\s*clearLocalSession\(\)/);
  assert.match(performLogout, /await authApi\.getSession\(\)/);
  assert.match(performLogout, /verificationError instanceof ApiError && verificationError\.status === 401/);
  assert.match(performLogout, /setLogoutFailed\(true\)/);
  assert.doesNotMatch(performLogout, /Clear the local session even when the local server is unreachable/);
});

test('an unconfirmed logout keeps the authenticated UI and exposes an explicit retry', () => {
  assert.match(app, /if \(logoutInFlightRef\.current\) return/);
  assert.match(app, /The server could not confirm revocation\. Keep the authenticated UI visible\./);
  assert.match(app, /logoutFailed && \(/);
  assert.match(app, /onAction=\{\(\) => void performLogout\(\)\}/);
});

test('preview credentials are cleared only after successful logout or an invalid session response', () => {
  assert.match(apiClient, /url === '\/api\/auth\/logout' && response\.ok/);
  assert.match(apiClient, /url === '\/api\/auth\/me' && response\.status === 401/);
  assert.doesNotMatch(apiClient, /if \(url === '\/api\/auth\/logout'\)\s*\{\s*previewSessionToken = null;/);
});
