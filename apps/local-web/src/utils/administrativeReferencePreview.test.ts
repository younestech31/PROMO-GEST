import test from 'node:test';
import assert from 'node:assert/strict';
import { DEV_PREVIEW_ADMINISTRATIVE_REFERENCE } from './administrativeReferencePreview';

test('Vite preview administrative reference mirrors the public API contract', () => {
  const reference = DEV_PREVIEW_ADMINISTRATIVE_REFERENCE;
  assert.equal(reference.version, '2026-06-03-wilayas-69');
  assert.equal(reference.effectiveDate, '2026-06-03');
  assert.equal(reference.communeDatasetStatus, 'PendingOfficialVerification');
  assert.equal(reference.communeLegalBaselineCount, 1541);
  assert.equal(reference.communesCount, 0);
  assert.equal(reference.wilayas.length, 69);
  assert.deepEqual(
    reference.wilayas.map((wilaya) => wilaya.code),
    Array.from({ length: 69 }, (_, index) => String(index + 1).padStart(2, '0')),
  );
  assert.equal(reference.wilayas[68].canonicalDisplayName, 'الأبيض سيدي الشيخ / El Abiodh Sidi Cheikh');
});
