import test from 'node:test';
import assert from 'node:assert/strict';
import { isStateChangingMethod, parseCookieValue } from './csrf';

test('parseCookieValue extracts URL-decoded cookie cleanly', () => {
  const header = 'foo=bar; promogest_csrf=abc%2B123%3D; other=xyz';
  assert.equal(parseCookieValue(header, 'promogest_csrf'), 'abc+123=');
  assert.equal(parseCookieValue(header, 'missing'), null);
  assert.equal(parseCookieValue('', 'promogest_csrf'), null);
});

test('isStateChangingMethod detects mutating HTTP verbs only', () => {
  assert.equal(isStateChangingMethod('GET'), false);
  assert.equal(isStateChangingMethod('HEAD'), false);
  assert.equal(isStateChangingMethod(undefined), false);
  assert.equal(isStateChangingMethod('post'), true);
  assert.equal(isStateChangingMethod('PUT'), true);
  assert.equal(isStateChangingMethod('PATCH'), true);
  assert.equal(isStateChangingMethod('DELETE'), true);
});
