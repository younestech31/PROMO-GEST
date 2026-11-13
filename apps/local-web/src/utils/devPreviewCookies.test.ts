import test from 'node:test';
import assert from 'node:assert/strict';
import { getDevPreviewCookieAttributes } from './devPreviewCookies';

test('uses partitioned cross-site cookies for HTTPS development previews', () => {
  const attributes = getDevPreviewCookieAttributes('https');
  assert.match(attributes, /SameSite=None/);
  assert.match(attributes, /Secure/);
  assert.match(attributes, /Partitioned/);
});

test('uses the first forwarded protocol value from a proxy chain', () => {
  const attributes = getDevPreviewCookieAttributes('https, http');
  assert.match(attributes, /SameSite=None/);
  assert.match(attributes, /Partitioned/);
});

test('detects HTTPS when the Vite server socket is encrypted', () => {
  const attributes = getDevPreviewCookieAttributes(undefined, true);
  assert.match(attributes, /SameSite=None/);
  assert.match(attributes, /Secure/);
});

test('keeps ordinary local HTTP development on same-site cookies', () => {
  const attributes = getDevPreviewCookieAttributes('http');
  assert.match(attributes, /SameSite=Strict/);
  assert.doesNotMatch(attributes, /Secure|Partitioned/);
});
