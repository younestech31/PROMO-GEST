import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiClient } from '../core/api/apiClient';

test('updatePreferredLanguage uses the authenticated CSRF-protected endpoint and concurrency stamp', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const session = {
    user: {
      id: 'user-1',
      username: 'operator',
      fullName: 'Operator',
      email: 'operator@example.test',
      phone: null,
      isSystemAdministrator: false,
      isActive: true,
      preferredLanguage: 'fr',
      concurrencyStamp: 'stamp-after-update',
      roles: [],
      permissions: [],
      lastLoginAtUtc: null,
      mustChangePasswordAtNextLogin: false,
      passwordChangeRequiredUntilUtc: null,
    },
    organization: {
      id: 'org-1',
      legalName: 'Example',
      tradeName: null,
      legalForm: 'SARL',
      nif: null,
      nis: null,
      tradeRegisterNumber: null,
      taxArticleNumber: null,
      shareCapitalDzd: null,
      wilayaCode: '31',
      wilayaName: 'Oran',
      address: 'Oran',
      phone: null,
      email: null,
      defaultLanguage: 'ar',
      currencyCode: 'DZD',
    },
  };

  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    requests.push({ url, init });
    if (url === '/api/auth/csrf') {
      return new Response(JSON.stringify({ token: 'csrf-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(session), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const result = await apiClient.updatePreferredLanguage('fr', 'stamp-before-update');
    assert.equal(result.user.preferredLanguage, 'fr');
    assert.equal(requests.length, 2);
    assert.equal(requests[1].url, '/api/auth/preferred-language');
    assert.equal(requests[1].init?.method, 'PUT');
    assert.equal(
      (requests[1].init?.headers as Record<string, string>)['X-CSRF-TOKEN'],
      'csrf-token'
    );
    assert.deepEqual(JSON.parse(String(requests[1].init?.body)), {
      preferredLanguage: 'fr',
      expectedConcurrencyStamp: 'stamp-before-update',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
