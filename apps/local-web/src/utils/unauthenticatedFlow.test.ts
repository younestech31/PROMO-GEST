import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), 'utf8');

const app = readSource('../app/App.tsx');
const setup = readSource('../modules/setup/pages/FirstRunSetupWizard.tsx');
const login = readSource('../modules/auth/pages/LoginScreen.tsx');
const translations = readSource('../core/localization/translations.ts');

test('successful first-run setup transitions to login without assuming an authenticated cookie', () => {
  const start = app.indexOf('const handleInitialized = async');
  assert.notEqual(start, -1);
  const end = app.indexOf('\n  };', start);
  assert.notEqual(end, -1);
  const handoff = app.slice(start, end);

  assert.match(handoff, /setSession\(null\)/);
  assert.match(handoff, /setSetupState\(\{ isInitialized: true, organizationLegalName \}\)/);
  assert.match(handoff, /setSetupCompletedNotice\(true\)/);
  assert.doesNotMatch(handoff, /authApi\.getSession|apiClient\.listProjects/);
});

test('the setup wizard passes authoritative setup details to the login handoff', () => {
  assert.match(setup, /currentSetup\.defaultLanguage \?\? form\.defaultLanguage/);
  assert.match(setup, /currentSetup\.organizationLegalName \?\? form\.legalName/);
  assert.match(setup, /initialized\.organizationLegalName/);
  assert.match(setup, /SETUP_ALREADY_INITIALIZED/);
  assert.match(setup, /completedSetup\.defaultLanguage/);
});

test('unauthenticated users can select the interface language and see setup completion feedback', () => {
  assert.match(app, /if \(!session\) \{\s*setUnauthenticatedLanguage\(nextLanguage\);\s*return;/);
  assert.match(app, /session\?\.user\.preferredLanguage \?\? unauthenticatedLanguage/);
  assert.match(login, /setupCompleted\?: boolean/);
  assert.match(login, /role="status"/);
  assert.match(translations, /اكتملت تهيئة المؤسسة وإنشاء حساب مدير النظام/);
  assert.match(translations, /L’organisation est initialisée et le compte Administrateur Système est créé/);
});
