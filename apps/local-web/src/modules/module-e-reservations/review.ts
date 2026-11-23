import type { ProjectSalesReservationDto } from '@/types/erp';

/**
 * ADR-0018 review queue. A hold belongs to the queue only while it is still active, has a recorded
 * review request, and has no recorded review. The predicate is re-applied in the UI on top of the
 * server filter (`?reviewRequired=true`) so a stale or drifting response can never show a completed
 * or closed hold as awaiting review.
 */
export function isReservationAwaitingReview(
  reservation: Pick<
    ProjectSalesReservationDto,
    'status' | 'reviewRequiredAtUtc' | 'reviewCompletedAtUtc'
  >,
): boolean {
  return (
    reservation.status === 'Active' &&
    Boolean(reservation.reviewRequiredAtUtc) &&
    !reservation.reviewCompletedAtUtc
  );
}

export type ReservationReviewState = 'awaiting' | 'reviewed' | 'notRequired';

export function reservationReviewState(
  reservation: Pick<
    ProjectSalesReservationDto,
    'status' | 'reviewRequiredAtUtc' | 'reviewCompletedAtUtc'
  >,
): ReservationReviewState {
  if (isReservationAwaitingReview(reservation)) return 'awaiting';
  if (reservation.reviewCompletedAtUtc) return 'reviewed';
  return 'notRequired';
}

export function partitionReservationsByReview(rows: readonly ProjectSalesReservationDto[]): {
  awaiting: ProjectSalesReservationDto[];
  reviewed: ProjectSalesReservationDto[];
  notRequired: ProjectSalesReservationDto[];
} {
  const awaiting: ProjectSalesReservationDto[] = [];
  const reviewed: ProjectSalesReservationDto[] = [];
  const notRequired: ProjectSalesReservationDto[] = [];

  for (const row of rows) {
    const state = reservationReviewState(row);
    if (state === 'awaiting') awaiting.push(row);
    else if (state === 'reviewed') reviewed.push(row);
    else notRequired.push(row);
  }

  return { awaiting, reviewed, notRequired };
}

/**
 * Recording a review is bookkeeping only: it never approves, cancels, or releases the hold, and it
 * never lifts the project suspension. The wording is therefore explicit in both languages.
 */
export const RESERVATION_REVIEW_NOT_APPROVAL_NOTE = {
  ar: 'تسجيل المراجعة إجراء توثيقي فقط: لا يعتمد الحجز ولا يلغيه ولا يحرر الوحدة، ولا يرفع تعليق المشروع. تبقى الحجوزات الجديدة ممنوعة حتى تغيير حالة المشروع بقرار صريح.',
  fr: 'Enregistrer la revue est purement documentaire : cela n’approuve pas la réservation, ne l’annule pas, ne libère pas l’unité et ne lève pas la suspension du projet. Les nouvelles réservations restent bloquées jusqu’à une décision explicite sur l’état du projet.',
} as const;
