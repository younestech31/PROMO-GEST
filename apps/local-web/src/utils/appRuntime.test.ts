import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getDocumentPresentation,
  isViteDevelopmentBuild,
  isVitePreviewRuntime,
} from '../shared/utils/appRuntime';

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const appSource = read('../app/App.tsx');
const loginSource = read('../modules/auth/pages/LoginScreen.tsx');
const setupSource = read('../modules/setup/pages/FirstRunSetupWizard.tsx');
const apiClientSource = read('../core/api/apiClient.ts');
const rootViteConfig = read('../../../vite.config.ts');
const appViteConfig = read('../../vite.config.ts');
const devMiddleware = read('../../dev-api-middleware.ts');
const devLauncher = read('../../../../scripts/dev-with-local-api.sh');

test('Vite development build flag is derived only from the Vite environment', () => {
  assert.equal(isViteDevelopmentBuild, import.meta.env?.DEV === true);
});

test('isVitePreviewRuntime enables preview mode only when health reports previewMode === true', () => {
  assert.equal(isVitePreviewRuntime(null), false);
  assert.equal(
    isVitePreviewRuntime({
      status: 'Healthy',
      databaseConnected: true,
      isInitialized: true,
      timestampUtc: '2026-01-01T00:00:00Z',
      environmentMode: 'Development',
    }),
    false
  );
  assert.equal(
    isVitePreviewRuntime({
      status: 'Healthy',
      databaseConnected: true,
      isInitialized: true,
      timestampUtc: '2026-01-01T00:00:00Z',
      environmentMode: 'ViteDevPreview',
      previewMode: false,
    }),
    false
  );
  assert.equal(
    isVitePreviewRuntime({
      status: 'Healthy',
      databaseConnected: true,
      isInitialized: true,
      timestampUtc: '2026-01-01T00:00:00Z',
      environmentMode: 'ViteDevPreview',
      previewMode: true,
    }),
    true
  );
});

test('getDocumentPresentation switches lang and dir cleanly between Arabic RTL and French LTR', () => {
  assert.deepEqual(getDocumentPresentation('ar'), {
    lang: 'ar',
    dir: 'rtl',
    title: 'PROMO GEST — نظام تسيير الترقية العقارية',
  });
  assert.deepEqual(getDocumentPresentation('fr'), {
    lang: 'fr',
    dir: 'ltr',
    title: 'PROMO GEST — ERP Promotion Immobilière',
  });
});

test('preview UI and session entry are constrained to Vite development mode', () => {
  assert.match(appSource, /const isPreviewMode = isViteDevelopmentBuild && isVitePreviewRuntime\(health\);/);
  assert.match(appSource, /if \(!isViteDevelopmentBuild \|\| !isPreviewMode\)/);
  assert.match(appSource, /apiClient\.openPreviewSession\(\)/);
  assert.doesNotMatch(appSource, /authApi\.openPreviewSession/);
  assert.match(loginSource, /import\.meta\.env\.DEV && isPreviewMode/);
  assert.match(setupSource, /import\.meta\.env\.DEV && isPreviewMode/);
  assert.match(apiClientSource, /const isViteDevelopmentBuild = import\.meta\.env\?\.DEV === true/);
  assert.match(apiClientSource, /isViteDevelopmentBuild && url === '\/api\/auth\/preview-session'/);
  assert.match(apiClientSource, /isViteDevelopmentBuild && previewSessionToken/);
});

test('both Vite configurations require the explicit preview policy before loading its middleware', () => {
  for (const config of [rootViteConfig, appViteConfig]) {
    assert.match(config, /resolveVitePreviewPolicy/);
    assert.match(config, /if \(policy\.previewEnabled\)/);
    assert.match(config, /host: policy\.host/);
    assert.doesNotMatch(config, /command === 'serve' && !aspNetCoreUrl/);
  }
  assert.match(devMiddleware, /options\.previewEnabled !== true/);
  assert.match(devLauncher, /explicitly set PROMOGEST_VITE_ONLY=1/);
  assert.doesNotMatch(devLauncher, /--host=0\.0\.0\.0/);
});
