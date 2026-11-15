import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isStateChangingMethod,
  parseCookieValue,
  requiresFreshCsrfToken,
  shouldRetryCsrfError,
} from './csrf';

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

test('requiresFreshCsrfToken enforces fresh token on login and initial setup', () => {
  assert.equal(requiresFreshCsrfToken('/api/auth/login'), true);
  assert.equal(requiresFreshCsrfToken('/api/setup/initialize'), true);
  assert.equal(requiresFreshCsrfToken('/api/projects'), false);
});

test('shouldRetryCsrfError retries once only on mutating 403 CSRF or non-JSON proxy 403', () => {
  assert.equal(
    shouldRetryCsrfError({ status: 403, isMutating: true, isRetry: false, isJson: true, errorCode: 'CSRF_TOKEN_INVALID' }),
    true
  );
  assert.equal(
    shouldRetryCsrfError({ status: 403, isMutating: true, isRetry: false, isJson: false }),
    true
  );
  assert.equal(
    shouldRetryCsrfError({ status: 403, isMutating: true, isRetry: true, isJson: false }),
    false
  );
  assert.equal(
    shouldRetryCsrfError({ status: 403, isMutating: true, isRetry: false, isJson: true, errorCode: 'FORBIDDEN_PROJECT_UPDATE' }),
    false
  );
  assert.equal(
    shouldRetryCsrfError({ status: 403, isMutating: false, isRetry: false, isJson: false }),
    false
  );
  assert.equal(
    shouldRetryCsrfError({ status: 401, isMutating: true, isRetry: false, isJson: true, errorCode: 'AUTH_INVALID_CREDENTIALS' }),
    false
  );
});

