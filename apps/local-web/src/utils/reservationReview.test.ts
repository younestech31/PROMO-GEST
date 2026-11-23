import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RESERVATION_REVIEW_NOT_APPROVAL_NOTE,
  isReservationAwaitingReview,
  partitionReservationsByReview,
  reservationReviewState,
} from '../modules/module-e-reservations';
import type { ProjectSalesReservationDto } from '../types/erp';

function reservation(
  overrides: Partial<ProjectSalesReservationDto> = {}
): ProjectSalesReservationDto {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    projectId: '22222222-2222-2222-2222-222222222222',
    propertyUnitId: '33333333-3333-3333-3333-333333333333',
    unitNumber: 'A-004',
    projectCustomerId: '44444444-4444-4444-4444-444444444444',
    customerName: 'زبون تجريبي',
    reservationNumber: 'RSV-20261123-ABCD1234',
    status: 'Active',
    reservedAtUtc: '2026-11-23T09:00:00Z',
    expiresAtUtc: '2026-11-30T09:00:00Z',
    closedAtUtc: null,
    closedByUserId: null,
    closeReason: null,
    createdByUserId: '55555555-5555-5555-5555-555555555555',
    createdAtUtc: '2026-11-23T09:00:00Z',
    concurrencyStamp: '66666666-6666-6666-6666-666666666666',
    reviewRequiredAtUtc: null,
    reviewCompletedAtUtc: null,
    isAwaitingReview: false,
    ...overrides,
  };
}

test('an active hold with a pending review request is the only thing the queue shows', () => {
  assert.equal(
    isReservationAwaitingReview(reservation({ reviewRequiredAtUtc: '2026-11-23T10:00:00Z' })),
    true
  );

  // Recording the review removes the hold from the queue.
  assert.equal(
    isReservationAwaitingReview(
      reservation({
        reviewRequiredAtUtc: '2026-11-23T10:00:00Z',
        reviewCompletedAtUtc: '2026-11-23T11:00:00Z',
      })
    ),
    false
  );

  // A hold that was never queued is not in the queue.
  assert.equal(isReservationAwaitingReview(reservation()), false);

  // A closed hold never returns to the queue, even if a request was recorded earlier.
  assert.equal(
    isReservationAwaitingReview(
      reservation({ status: 'Cancelled', reviewRequiredAtUtc: '2026-11-23T10:00:00Z' })
    ),
    false
  );
  assert.equal(
    isReservationAwaitingReview(
      reservation({ status: 'Expired', reviewRequiredAtUtc: '2026-11-23T10:00:00Z' })
    ),
    false
  );
});

test('reservationReviewState distinguishes awaiting, reviewed and untouched holds', () => {
  assert.equal(reservationReviewState(reservation()), 'notRequired');
  assert.equal(
    reservationReviewState(reservation({ reviewRequiredAtUtc: '2026-11-23T10:00:00Z' })),
    'awaiting'
  );
  assert.equal(
    reservationReviewState(
      reservation({
        reviewRequiredAtUtc: '2026-11-23T10:00:00Z',
        reviewCompletedAtUtc: '2026-11-23T11:00:00Z',
      })
    ),
    'reviewed'
  );
});

test('partitionReservationsByReview keeps every row and its order', () => {
  const first = reservation({ id: 'a', reviewRequiredAtUtc: '2026-11-23T10:00:00Z' });
  const second = reservation({ id: 'b' });
  const third = reservation({
    id: 'c',
    reviewRequiredAtUtc: '2026-11-23T10:00:00Z',
    reviewCompletedAtUtc: '2026-11-23T12:00:00Z',
  });
  const fourth = reservation({ id: 'd', reviewRequiredAtUtc: '2026-11-23T10:30:00Z' });

  const { awaiting, reviewed, notRequired } = partitionReservationsByReview([
    first,
    second,
    third,
    fourth,
  ]);

  assert.deepEqual(awaiting.map((row) => row.id), ['a', 'd']);
  assert.deepEqual(reviewed.map((row) => row.id), ['c']);
  assert.deepEqual(notRequired.map((row) => row.id), ['b']);
});

test('the review wording states in both languages that reviewing is not approval', () => {
  assert.match(RESERVATION_REVIEW_NOT_APPROVAL_NOTE.ar, /لا يعتمد الحجز/);
  assert.match(RESERVATION_REVIEW_NOT_APPROVAL_NOTE.ar, /ولا يرفع تعليق المشروع/);
  assert.match(RESERVATION_REVIEW_NOT_APPROVAL_NOTE.fr, /n’approuve pas la réservation/);
  assert.match(RESERVATION_REVIEW_NOT_APPROVAL_NOTE.fr, /ne lève pas la suspension/);
});
