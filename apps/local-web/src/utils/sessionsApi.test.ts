import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiClient } from '../core/api/apiClient';

test('listOwnSessions reads only the authenticated self-service sessions endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const sessions = [{
    id: 'session-1',
    createdAtUtc: '2026-11-25T10:00:00Z',
    lastSeenAtUtc: '2026-11-25T11:00:00Z',
    expiresAtUtc: '2026-11-25T22:00:00Z',
    ipAddress: '192.0.2.10',
    userAgent: 'Browser',
    isCurrentSession: true,
  }];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    requests.push({ url, init });
    return new Response(JSON.stringify(sessions), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const result = await apiClient.listOwnSessions();
    assert.deepEqual(result, sessions);
    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.url, '/api/auth/sessions');
    assert.equal(requests[0]?.init?.method, 'GET');
    assert.equal(requests[0]?.init?.credentials, 'include');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('revokeOwnSession sends the selected id and explicit current-session disposition with CSRF', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    requests.push({ url, init });
    if (url === '/api/auth/csrf') {
      return new Response(JSON.stringify({ token: 'csrf-session-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(null, { status: 204 });
  };

  try {
    await apiClient.revokeOwnSession('7f4a1a8e-5a8c-4d20-a2a0-8e61e6d0f123', false);
    const mutation = requests.find((request) => request.url.includes('/sessions/'));
    assert.ok(mutation);
    assert.equal(mutation.url, '/api/auth/sessions/7f4a1a8e-5a8c-4d20-a2a0-8e61e6d0f123/revoke');
    assert.equal(mutation.init?.method, 'POST');
    assert.equal(new Headers(mutation.init?.headers).get('X-CSRF-TOKEN'), 'csrf-session-token');
    assert.deepEqual(JSON.parse(String(mutation.init?.body)), { endCurrentSession: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
