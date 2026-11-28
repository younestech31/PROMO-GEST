import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarClock, CheckCircle2, LoaderCircle, Plus, ShieldAlert, X } from 'lucide-react';
import type {
  AppLanguage,
  ProjectCustomerListItemDto,
  ProjectDto,
  ProjectSalesReservationDto,
  PropertyUnitDto,
} from '@/types/erp';
import { apiClient, ApiError } from '@/core/api/apiClient';
import { translateApiError } from '@/core/localization/translations';
import { Modal } from '@/shared/components/Modal';
import { ConfirmDialog } from '@/shared/components/StateViews';
import {
  RESERVATION_REVIEW_NOT_APPROVAL_NOTE,
  isReservationAwaitingReview,
} from '../review';

interface ProjectSalesReservationsModalProps {
  project: ProjectDto;
  language: AppLanguage;
  canManage: boolean;
  mode?: 'modal' | 'embedded';
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const fieldClass = 'w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700';
const labelClass = 'block space-y-1.5 text-xs font-medium text-slate-700';

function defaultExpiryLocal(): string {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function displayDate(value: string, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusText(status: string, language: AppLanguage): string {
  const labels: Record<string, { ar: string; fr: string }> = {
    Active: { ar: 'نشط', fr: 'Active' },
    Cancelled: { ar: 'ملغى', fr: 'Annulée' },
    Expired: { ar: 'منتهٍ', fr: 'Expirée' },
  };
  return labels[status]?.[language] ?? status;
}

function errorText(error: unknown, language: AppLanguage): string {
  if (error instanceof ApiError) return translateApiError(error.code, error.message, language);
  return language === 'ar'
    ? 'تعذر إتمام العملية على الخادم المحلي.'
    : 'Impossible de terminer l’opération sur le serveur local.';
}

export function ProjectSalesReservationsModal({
  project,
  language,
  canManage,
  mode = 'modal',
  onClose,
  onDirtyChange,
}: ProjectSalesReservationsModalProps) {
  const isArabic = language === 'ar';
  const [reservations, setReservations] = useState<ProjectSalesReservationDto[]>([]);
  const [customers, setCustomers] = useState<ProjectCustomerListItemDto[]>([]);
  const [units, setUnits] = useState<PropertyUnitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataReady, setDataReady] = useState(false);
  const [conflictRefreshed, setConflictRefreshed] = useState(false);
  const loadGeneration = useRef(0);
  const viewLifetime = useRef<object | null>(null);
  const optionsProject = useRef<string | null>(null);
  const [unitId, setUnitId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [expiresAtLocal, setExpiresAtLocal] = useState(defaultExpiryLocal);
  const [hasFormEdits, setHasFormEdits] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<ProjectSalesReservationDto[]>([]);
  const [reviewTargetId, setReviewTargetId] = useState<string | null>(null);
  // Selected actions always use the last successfully loaded server version.
  const cancelTarget = reservations.find((row) => row.id === cancelTargetId && row.status === 'Active') ?? null;
  const reviewTarget = reviewQueue.find((row) => row.id === reviewTargetId) ?? null;
  const actionsDisabled = !canManage || saving || loading || !dataReady;

  const isDirty = canManage && (hasFormEdits || cancelTarget !== null || cancelReason.trim() !== '');

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const requestClose = () => {
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    onClose?.();
  };

  const loadData = useCallback(async () => {
    const generation = ++loadGeneration.current;
    setLoading(true);
    setDataReady(false);
    setLoadError(null);
    try {
      // Publish one complete snapshot, never new holds with old unit/customer options.
      const [reservationRows, reviewQueueRows, structure, customerRows] = await Promise.all([
        apiClient.listProjectSalesReservations(project.id),
        apiClient.listProjectSalesReservations(project.id, { reviewRequired: true }),
        canManage ? apiClient.getProjectStructure(project.id) : Promise.resolve(null),
        canManage ? apiClient.listProjectCustomers(project.id) : Promise.resolve([]),
      ]);
      if (generation !== loadGeneration.current) return false;
      const available = structure?.buildings
        .flatMap((building) => building.floors)
        .flatMap((floor) => floor.units)
        .filter((unit) => unit.status === 'AvailableForSale') ?? [];
      const eligibleCustomers = customerRows.filter((customer) => customer.status !== 'Archived');
      setReservations(reservationRows);
      setReviewQueue(reviewQueueRows.filter(isReservationAwaitingReview));
      setUnits(available);
      setCustomers(eligibleCustomers);
      const initializeOptions = optionsProject.current !== project.id;
      if (canManage) optionsProject.current = project.id;
      setUnitId((current) => current
        ? (available.some((unit) => unit.id === current) ? current : '')
        : (initializeOptions ? available[0]?.id ?? '' : ''));
      setCustomerId((current) => current
        ? (eligibleCustomers.some((customer) => customer.id === current) ? current : '')
        : (initializeOptions ? eligibleCustomers[0]?.id ?? '' : ''));
      setDataReady(true);
      return true;
    } catch (loadError) {
      if (generation !== loadGeneration.current) return false;
      setLoadError(errorText(loadError, language));
      return false;
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [project.id, canManage, language]);

  useEffect(() => {
    viewLifetime.current = {};
    setSaving(false);
    void loadData();
    return () => {
      viewLifetime.current = null;
      ++loadGeneration.current;
    };
  }, [loadData]);

  useEffect(() => {
    // A terminal/missing hold cannot keep an obsolete cancellation form open.
    if (dataReady && !cancelTarget) {
      setCancelTargetId(null);
      setCancelReason('');
    }
    if (dataReady && !reviewTarget) setReviewTargetId(null);
  }, [dataReady, cancelTarget, reviewTarget]);

  const handleMutationError = async (mutationError: unknown, lifetime: object | null) => {
    if (lifetime !== viewLifetime.current) return;
    setError(errorText(mutationError, language));
    // A 409 can mean expiry was persisted or another actor changed the hold/unit.
    // Refresh authoritative state, but never replay the rejected write.
    if (mutationError instanceof ApiError && mutationError.status === 409) {
      const refreshed = await loadData();
      if (lifetime === viewLifetime.current) setConflictRefreshed(refreshed);
    }
  };

  const submitReservation = async (event: FormEvent) => {
    event.preventDefault();
    if (actionsDisabled) return;
    const lifetime = viewLifetime.current;
    setSaving(true);
    setConflictRefreshed(false);
    setError(null);
    try {
      const expiresAtUtc = new Date(expiresAtLocal);
      if (!Number.isFinite(expiresAtUtc.getTime())) {
        throw new Error(isArabic ? 'تاريخ الانتهاء غير صالح.' : 'La date d’expiration est invalide.');
      }
      await apiClient.createProjectSalesReservation(project.id, {
        propertyUnitId: unitId,
        projectCustomerId: customerId,
        expiresAtUtc: expiresAtUtc.toISOString(),
      });
      if (lifetime !== viewLifetime.current) return;
      setExpiresAtLocal(defaultExpiryLocal());
      setHasFormEdits(false);
      await loadData();
    } catch (submitError) {
      await handleMutationError(submitError, lifetime);
    } finally {
      if (lifetime === viewLifetime.current) setSaving(false);
    }
  };

  const submitCancellation = async (event: FormEvent) => {
    event.preventDefault();
    if (actionsDisabled || !cancelTarget) return;
    const lifetime = viewLifetime.current;
    setSaving(true);
    setConflictRefreshed(false);
    setError(null);
    try {
      await apiClient.cancelProjectSalesReservation(project.id, cancelTarget.id, {
        reason: cancelReason.trim(),
        expectedConcurrencyStamp: cancelTarget.concurrencyStamp,
      });
      if (lifetime !== viewLifetime.current) return;
      setCancelTargetId(null);
      setCancelReason('');
      await loadData();
    } catch (cancelError) {
      await handleMutationError(cancelError, lifetime);
    } finally {
      if (lifetime === viewLifetime.current) setSaving(false);
    }
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (actionsDisabled || !reviewTarget) return;
    const lifetime = viewLifetime.current;
    setSaving(true);
    setConflictRefreshed(false);
    setError(null);
    try {
      await apiClient.reviewProjectSalesReservation(project.id, reviewTarget.id, {
        expectedConcurrencyStamp: reviewTarget.concurrencyStamp,
      });
      if (lifetime !== viewLifetime.current) return;
      setReviewTargetId(null);
      await loadData();
    } catch (reviewError) {
      await handleMutationError(reviewError, lifetime);
    } finally {
      if (lifetime === viewLifetime.current) setSaving(false);
    }
  };

  const title = isArabic ? 'حجوزات المشروع' : 'Réservations du projet';

  const reservationsContent = (
    <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
      <div className="rounded-md border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-950">
        <strong>{isArabic ? 'تنبيه تنظيمي (القانون 11-04): ' : 'Cadre légal (Loi 11-04) : '}</strong>
        {isArabic
          ? 'يمثل الحجز الداخلي تجميداً تجارياً مؤقتاً للوحدة بدون أي قبض مالي أو أثر تعاقدي قانوني. العقود التوثيقية والتحصيل المضمون (FGCMPI / VSP) ستُدار في الوحدتين (و) و(ز).'
          : 'La réservation interne constitue un blocage commercial temporaire sans flux financier ni effet contractuel. Les contrats réglementaires et encaissements (FGCMPI / VSP) relèvent des modules F et G.'}
      </div>

      {error && <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}
      {loadError && (
        <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          <p>{loadError}</p>
          <button type="button" disabled={saving || loading} onClick={() => void loadData()}
            className="mt-2 rounded border border-red-300 px-3 py-2 font-semibold disabled:opacity-50">
            {isArabic ? 'إعادة تحميل البيانات' : 'Recharger les données'}
          </button>
        </div>
      )}
      {conflictRefreshed && dataReady && (
        <p role="status" className="rounded border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-950">
          {isArabic
            ? 'تم تحديث البيانات من الخادم. لم تُكرر العملية تلقائياً. راجع الحالة الحالية قبل تأكيد أي إجراء جديد.'
            : 'Les données ont été rechargées. L’opération n’a pas été répétée automatiquement. Vérifiez l’état actuel avant toute nouvelle confirmation.'}
        </p>
      )}

      <section
        aria-labelledby="reservation-review-queue-title"
        className="space-y-3 rounded-md border border-amber-300 bg-amber-50/40 p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <h3 id="reservation-review-queue-title" className="text-sm font-bold text-slate-900">
              {isArabic ? 'طابور مراجعة التعليق' : 'File de revue de suspension'}{' '}
              <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-950">
                {reviewQueue.length}
              </span>
            </h3>
          </div>
          <p className="max-w-xl text-[11px] leading-5 text-amber-950">
            {isArabic
              ? 'حجوزات نشطة في مشروع معلّق أو محجوز تنتظر مراجعة موثّقة. المراجعة لا تعتمد الحجز ولا ترفع التعليق.'
              : 'Réservations actives d’un projet suspendu ou gelé en attente d’une revue documentée. La revue n’approuve pas la réservation et ne lève pas la suspension.'}
          </p>
        </div>

        {reviewTarget ? (
          <form onSubmit={submitReview} className="space-y-2 rounded border border-amber-300 bg-white p-3">
            <div className="text-xs font-semibold text-slate-900">
              {isArabic
                ? `تسجيل مراجعة الحجز ${reviewTarget.reservationNumber}`
                : `Enregistrer la revue de ${reviewTarget.reservationNumber}`}
            </div>
            <p className="rounded border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-5 text-amber-950">
              {RESERVATION_REVIEW_NOT_APPROVAL_NOTE[language]}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={actionsDisabled}
                className="inline-flex items-center gap-1.5 rounded bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {isArabic ? 'تأكيد تسجيل المراجعة' : 'Confirmer la revue'}
              </button>
              <button
                type="button"
                disabled={actionsDisabled}
                onClick={() => setReviewTargetId(null)}
                className="rounded border border-slate-300 px-3 py-2 text-xs text-slate-700 disabled:opacity-50"
              >
                {isArabic ? 'تراجع' : 'Retour'}
              </button>
            </div>
          </form>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            {isArabic ? 'جارٍ التحميل...' : 'Chargement...'}
          </div>
        ) : !dataReady ? null : reviewQueue.length === 0 ? (
          <p className="rounded border border-dashed border-amber-300 bg-white px-3 py-4 text-center text-xs text-slate-600">
            {isArabic ? 'لا توجد حجوزات بانتظار المراجعة.' : 'Aucune réservation en attente de revue.'}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded border border-amber-200 bg-white">
              <table className="min-w-full divide-y divide-amber-100 text-xs">
                <thead className="bg-amber-50 text-amber-950">
                  <tr>
                    <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'المرجع الداخلي' : 'Référence interne'}</th>
                    <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'الوحدة' : 'Unité'}</th>
                    <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'الزبون' : 'Client'}</th>
                    <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'تاريخ الطلب' : 'Demande'}</th>
                    <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'انتهاء الحجز' : 'Expiration'}</th>
                    {canManage && <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'إجراء' : 'Action'}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {reviewQueue.map((reservation) => (
                    <tr key={reservation.id} className="text-slate-800">
                      <td className="px-3 py-2.5 font-mono text-[11px]">{reservation.reservationNumber}</td>
                      <td className="px-3 py-2.5 font-semibold">{reservation.unitNumber}</td>
                      <td className="px-3 py-2.5">{reservation.customerName}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {reservation.reviewRequiredAtUtc ? displayDate(reservation.reviewRequiredAtUtc, language) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">{displayDate(reservation.expiresAtUtc, language)}</td>
                      {canManage && (
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            disabled={actionsDisabled}
                            onClick={() => setReviewTargetId(reservation.id)}
                            className="rounded border border-amber-700 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                          >
                            {isArabic ? 'تمت المراجعة' : 'Revue effectuée'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!canManage && (
              <p className="text-[11px] text-amber-900">
                {isArabic
                  ? 'تحتاج صلاحية إدارة الحجوزات في هذا المشروع لتسجيل المراجعة.'
                  : 'La permission de gestion des réservations de ce projet est requise pour enregistrer une revue.'}
              </p>
            )}
          </>
        )}
      </section>

      {canManage && (
            <form onSubmit={submitReservation} className="grid grid-cols-1 items-end gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <label className={labelClass}>
                <span>{isArabic ? 'الوحدة المتاحة *' : 'Unité disponible *'}</span>
                <select className={fieldClass} required value={unitId} onChange={(event) => { setUnitId(event.target.value); setHasFormEdits(true); }}>
                  <option value="">{isArabic ? 'اختر الوحدة' : 'Choisir une unité'}</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unitNumber} · {unit.unitType} · {unit.netAreaSquareMeters ?? unit.grossAreaSquareMeters ?? '—'} m²
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                <span>{isArabic ? 'الزبون / المهتم *' : 'Client / prospect *'}</span>
                <select className={fieldClass} required value={customerId} onChange={(event) => { setCustomerId(event.target.value); setHasFormEdits(true); }}>
                  <option value="">{isArabic ? 'اختر الزبون' : 'Choisir un client'}</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.displayName} · {customer.status}</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                <span>{isArabic ? 'تاريخ انتهاء الحجز *' : 'Expiration *'}</span>
                <input
                  className={fieldClass}
                  type="datetime-local"
                  required
                  value={expiresAtLocal}
                  onChange={(event) => { setExpiresAtLocal(event.target.value); setHasFormEdits(true); }}
                />
              </label>
              <button
                type="submit"
                disabled={actionsDisabled || !unitId || !customerId || !units.length || !customers.length}
                className="inline-flex items-center justify-center gap-1.5 rounded bg-teal-800 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {isArabic ? 'إنشاء حجز' : 'Créer une réservation'}
              </button>
              {(units.length === 0 || customers.length === 0) && !loading && (
                <p className="text-[11px] text-amber-700 md:col-span-4">
                  {isArabic
                    ? 'يلزم وجود وحدة متاحة للبيع وزبون غير مؤرشف داخل المشروع لإنشاء حجز.'
                    : 'Une unité disponible et un client non archivé dans ce projet sont nécessaires.'}
                </p>
              )}
            </form>
          )}

          {cancelTarget && (
            <form onSubmit={submitCancellation} className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="text-xs font-semibold text-slate-800">
                {isArabic ? `إلغاء الحجز ${cancelTarget.reservationNumber}` : `Annuler la réservation ${cancelTarget.reservationNumber}`}
              </div>
              <label className={labelClass}>
                <span>{isArabic ? 'سبب الإلغاء *' : 'Motif d’annulation *'}</span>
                <textarea
                  className={fieldClass}
                  rows={2}
                  maxLength={300}
                  required
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={actionsDisabled || !cancelReason.trim()} className="rounded bg-amber-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {isArabic ? 'تأكيد الإلغاء' : 'Confirmer l’annulation'}
                </button>
                <button type="button" disabled={saving} onClick={() => { setCancelTargetId(null); setCancelReason(''); }} className="rounded border border-slate-300 px-3 py-2 text-xs text-slate-700">
                  {isArabic ? 'تراجع' : 'Retour'}
                </button>
              </div>
            </form>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">
                {isArabic ? 'سجل الحجوزات' : 'Historique des réservations'} ({reservations.length})
              </h3>
              <button type="button" onClick={() => void loadData()} disabled={saving || loading} className="text-xs font-medium text-teal-800 hover:underline disabled:opacity-50">
                {isArabic ? 'تحديث' : 'Actualiser'}
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {isArabic ? 'جارٍ التحميل...' : 'Chargement...'}
              </div>
            ) : !dataReady ? null : reservations.length === 0 ? (
              <div className="rounded border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-500">
                {isArabic ? 'لا توجد حجوزات مسجلة لهذا المشروع.' : 'Aucune réservation enregistrée pour ce projet.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'المرجع الداخلي' : 'Référence interne'}</th>
                      <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'الوحدة' : 'Unité'}</th>
                      <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'الزبون' : 'Client'}</th>
                      <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'الحالة' : 'État'}</th>
                      <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'انتهاء الحجز' : 'Expiration'}</th>
                      <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'المراجعة' : 'Revue'}</th>
                      {canManage && <th className="px-3 py-2 text-start font-semibold">{isArabic ? 'إجراء' : 'Action'}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reservations.map((reservation) => (
                      <tr key={reservation.id} className="text-slate-700">
                        <td className="px-3 py-2.5 font-mono text-[11px]">{reservation.reservationNumber}</td>
                        <td className="px-3 py-2.5 font-semibold">{reservation.unitNumber}</td>
                        <td className="px-3 py-2.5">{reservation.customerName}</td>
                        <td className="px-3 py-2.5">
                          <span className={reservation.status === 'Active' ? 'rounded bg-emerald-50 px-2 py-1 text-emerald-800' : 'rounded bg-slate-100 px-2 py-1 text-slate-600'}>
                            {statusText(reservation.status, language)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">{displayDate(reservation.expiresAtUtc, language)}</td>
                        <td className="px-3 py-2.5">
                          {isReservationAwaitingReview(reservation) ? (
                            <span className="rounded bg-amber-100 px-2 py-1 font-semibold text-amber-900">
                              {isArabic ? 'بانتظار المراجعة' : 'En attente de revue'}
                            </span>
                          ) : reservation.reviewCompletedAtUtc ? (
                            <span className="text-slate-600">
                              {isArabic ? 'روجع في ' : 'Revu le '}
                              {displayDate(reservation.reviewCompletedAtUtc, language)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {canManage && (
                          <td className="px-3 py-2.5">
                            {reservation.status === 'Active' ? (
                              <button type="button" disabled={actionsDisabled} onClick={() => { setCancelTargetId(reservation.id); setCancelReason(''); }} className="text-xs font-semibold text-amber-800 hover:underline">
                                {isArabic ? 'إلغاء الحجز' : 'Annuler'}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {isArabic ? 'مغلق' : 'Clôturé'}
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
    </div>
  );

  const discardConfirmDialog = (
    <ConfirmDialog
      open={confirmDiscardOpen}
      title={isArabic ? 'تغييرات غير محفوظة' : 'Modifications non enregistrées'}
      message={
        isArabic
          ? 'لديك تعديلات غير محفوظة على نموذج الحجز أو الإلغاء. هل تريد تجاهلها وإغلاق النافذة؟'
          : 'Vous avez des modifications non enregistrées sur le formulaire de réservation ou d’annulation. Voulez-vous les abandonner ?'
      }
      confirmLabel={isArabic ? 'تجاهل وإغلاق' : 'Abandonner et fermer'}
      cancelLabel={isArabic ? 'البقاء في النموذج' : 'Continuer l’édition'}
      onConfirm={() => {
        setConfirmDiscardOpen(false);
        setHasFormEdits(false);
        setCancelTargetId(null);
        setCancelReason('');
        onClose?.();
      }}
      onCancel={() => setConfirmDiscardOpen(false)}
    />
  );

  if (mode === 'embedded') {
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
          {reservationsContent}
        </div>
        {discardConfirmDialog}
      </>
    );
  }

  return (
    <>
      <Modal
        open
        titleId="project-reservations-title"
        onClose={requestClose}
        closeDisabled={saving}
        dir={isArabic ? 'rtl' : 'ltr'}
        overlayClassName="fixed inset-0 z-[76] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5"
        panelClassName="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl outline-none"
      >
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-teal-800">
                <CalendarClock className="h-5 w-5 shrink-0" aria-hidden="true" />
                <h2 id="project-reservations-title" className="text-base font-bold text-slate-900">{title}</h2>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                <span className="font-data">{project.code}</span> · {isArabic ? project.nameAr : project.nameFr}
              </p>
            </div>
            <button type="button" onClick={requestClose} aria-label={isArabic ? 'إغلاق' : 'Fermer'} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          {reservationsContent}
      </Modal>
      {discardConfirmDialog}
    </>
  );
}
