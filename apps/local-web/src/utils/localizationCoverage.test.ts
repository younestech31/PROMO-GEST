import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { getTranslations, translateApiError } from '../core/localization/translations';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '..');

test('the login failure message comes from the translation bundle in both languages', () => {
  const arabic = getTranslations('ar').loginFailedGeneric;
  const french = getTranslations('fr').loginFailedGeneric;

  assert.ok(arabic.trim().length > 0);
  assert.ok(french.trim().length > 0);
  assert.notEqual(arabic, french);
  assert.match(arabic, /[\u0600-\u06FF]/);
});

test('password lifecycle API errors are translated instead of leaking server text', () => {
  for (const code of [
    'PASSWORD_CURRENT_INVALID',
    'PASSWORD_REUSE_NOT_ALLOWED',
    'PASSWORD_CHANGE_REQUIRED',
    'TEMPORARY_PASSWORD_EXPIRED',
    'AUTH_ACCOUNT_LOCKED',
    'AUTH_INVALID_CREDENTIALS',
  ]) {
    for (const language of ['ar', 'fr'] as const) {
      const translated = translateApiError(code, 'server-message-should-not-surface', language);
      assert.notEqual(translated, 'server-message-should-not-surface', `${code} must be translated for ${language}`);
      assert.ok(translated.trim().length > 0);
    }
  }
});

test('an unknown API error falls back to the caller-provided message', () => {
  assert.equal(
    translateApiError('SOMETHING_NOT_MAPPED', 'fallback text', 'ar'),
    'fallback text',
  );
});

test('authentication pages keep user-facing text in the translation bundle', () => {
  const pagesDir = path.join(srcRoot, 'modules', 'auth', 'pages');
  const offenders: string[] = [];

  for (const file of readdirSync(pagesDir).filter((name) => name.endsWith('.tsx'))) {
    const source = readFileSync(path.join(pagesDir, file), 'utf8');
    // Inline `language === 'ar' ? '…' : '…'` literals bypass the AR/FR catalogue.
    const inlineBilingual = /language\s*===\s*['"]ar['"]\s*\?/g;
    if (inlineBilingual.test(source)) {
      offenders.push(file);
    }
  }

  assert.deepEqual(offenders, [], `move inline bilingual strings into translations.ts: ${offenders.join(', ')}`);
});
