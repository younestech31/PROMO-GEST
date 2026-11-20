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

function walkCsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'bin' || entry.name === 'obj') return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walkCsFiles(full) : full.endsWith('.cs') ? [full] : [];
  });
}

test('every C# backend and preview middleware API error code has AR and FR translations', () => {
  const repoRoot = path.resolve(srcRoot, '..', '..', '..');
  const csFiles = walkCsFiles(path.join(repoRoot, 'src')).filter((file) => !file.includes('Tests'));
  const codes = new Set<string>();

  for (const file of csFiles) {
    const content = readFileSync(file, 'utf8');
    for (const match of content.matchAll(
      /\b(?:new\s+(?:\w*DomainException|ApiErrorResponse)|DomainException)\s*\(\s*"([A-Z][A-Z0-9_]+)"/gs,
    )) {
      codes.add(match[1]);
    }
    for (const match of content.matchAll(
      /\b(?:new\s+\w*DomainException|new\s+ApiErrorResponse)\s*\(\s*\r?\n\s*"([A-Z][A-Z0-9_]+)"/gs,
    )) {
      codes.add(match[1]);
    }
    for (const match of content.matchAll(
      /\b(?:RequireValidWilaya|TryNormalizeWilaya|Validate(?:Length|Name|Code))\([^;]*?"([A-Z][A-Z0-9_]+)"/gs,
    )) {
      codes.add(match[1]);
    }
    for (const match of content.matchAll(/"((?:ORG|PROJECT)_WILAYA_[A-Z0-9_]+)"/g)) {
      codes.add(match[1]);
    }
  }

  const middlewareSource = readFileSync(path.resolve(srcRoot, '..', 'dev-api-middleware.ts'), 'utf8');
  for (const match of middlewareSource.matchAll(
    /sendJson\(\s*res\s*,\s*(?:4\d\d|5\d\d)\s*,\s*\{\s*code:\s*['"]([A-Z][A-Z0-9_]+)['"]/gs,
  )) {
    codes.add(match[1]);
  }
  for (const match of middlewareSource.matchAll(/sendError\([\s\S]{0,120}?,\s*\d+,\s*['"]([A-Z][A-Z0-9_]+)['"]/g)) {
    codes.add(match[1]);
  }

  const untranslated: string[] = [];
  for (const code of [...codes].sort()) {
    const ar = translateApiError(code, '__UNMAPPED__', 'ar');
    const fr = translateApiError(code, '__UNMAPPED__', 'fr');
    if (ar === '__UNMAPPED__' || !/[\u0600-\u06FF]/.test(ar)) {
      untranslated.push(`${code} (ar)`);
    }
    if (fr === '__UNMAPPED__' || fr.trim().length === 0) {
      untranslated.push(`${code} (fr)`);
    }
  }

  assert.deepEqual(
    untranslated,
    [],
    `API error codes missing AR/FR localization: ${untranslated.join(', ')}`,
  );
});
