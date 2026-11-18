import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getDocumentPresentation, isVitePreviewRuntime } from '../shared/utils/appRuntime';

const appSource = readFileSync(new URL('../app/App.tsx', import.meta.url), 'utf8');

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

test('App.tsx gates preview UI on health.previewMode, syncs document lang/dir, and avoids mutating session', () => {
  assert.doesNotMatch(appSource, /isPreviewMode=\{true\}/);
  assert.match(appSource, /const isPreviewMode = isVitePreviewRuntime\(health\);/);
  assert.match(appSource, /isPreviewMode=\{isPreviewMode\}/);
  assert.match(appSource, /document\.documentElement\.lang = presentation\.lang;/);
  assert.match(appSource, /document\.documentElement\.dir = presentation\.dir;/);
  assert.doesNotMatch(appSource, /session\.organization\s*=/);
});
