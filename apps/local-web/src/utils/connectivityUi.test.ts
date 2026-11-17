import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8');

const app = readSource('../app/App.tsx');
const login = readSource('../features/auth/LoginScreen.tsx');
const setup = readSource('../features/setup/FirstRunSetupWizard.tsx');
const layout = readSource('../app/ErpShellLayout.tsx');
const overview = readSource('../modules/module-a-organization/pages/OverviewView.tsx');
const translations = readSource('../core/localization/translations.ts');

test('the global local-server disconnect message is absent from every main screen', () => {
  const screens = [app, login, setup, layout, overview];

  for (const source of screens) {
    assert.doesNotMatch(source, /ConnectionIndicator|serverDisconnectedBannerTitle|serverDisconnectedBannerBody/);
    assert.doesNotMatch(source, /\bserverDisconnected\b|\bserverConnected\b/);
  }

  assert.doesNotMatch(translations, /serverDisconnected|serverConnected|serverChecking|retryConnection/);
  assert.doesNotMatch(translations, /انقطاع الاتصال بالخادم المحلي|Connexion perdue avec le serveur local/);
});

test('failed login and setup network calls show a neutral operation-level message', () => {
  assert.match(login, /setAuthError\(t\.operationTemporarilyUnavailable\)/);
  assert.match(setup, /setSubmitError\(t\.operationTemporarilyUnavailable\)/);
  assert.match(translations, /تعذّر إتمام العملية حالياً/);
  assert.match(translations, /Opération impossible pour le moment/);
});

test('background diagnostics do not create a global disconnected state or overlap requests', () => {
  assert.doesNotMatch(app, /ServerConnectionState|connectionState|setConnectionState/);
  assert.match(app, /requestInFlight/);
  assert.match(app, /document\.visibilityState !== 'visible'/);
  assert.match(app, /60_000/);
  assert.match(login, /disabled=\{isSubmitting\}/);
});
