import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CalendarClock, CheckCircle2, LoaderCircle, Plus, X } from 'lucide-react';
import type {
  AppLanguage,
  ProjectCustomerListItemDto,
  ProjectDto,
  ProjectSalesReservationDto,
  PropertyUnitDto,
} from '../../types/erp';
import { apiClient, ApiError } from '../../services/apiClient';
import { translateApiError } from '../../localization/translations';

interface ProjectSalesReservationsModalProps {
  project: ProjectDto;
  language: AppLanguage;
  canManage: boolean;
  onClose: () => void;
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
  onClose,
}: ProjectSalesReservationsModalProps) {
  const isArabic = language === 'ar';
  const [reservations, setReservations] = useState<ProjectSalesReservationDto[]>([]);
  const [customers, setCustomers] = useState<ProjectCustomerListItemDto[]>([]);
  const [units, setUnits] = useState<PropertyUnitDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitId, setUnitId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [expiresAtLocal, setExpiresAtLocal] = useState(defaultExpiryLocal);
  const [cancelTarget, setCancelTarget] = useState<ProjectSalesReservationDto | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const reservationRows = await apiClient.listProjectSalesReservations(project.id);
      setReservations(reservationRows);

      if (canManage) {
        const [structure, customerRows] = await Promise.all([
          apiClient.getProjectStructure(project.id),
          apiClient.listProjectCustomers(project.id),
        ]);
        const available = structure.buildings
          .flatMap((building) => building.floors)
          .flatMap((floor) => floor.units)
          .filter((unit) => unit.status === 'AvailableForSale');
        const eligibleCustomers = customerRows.filter((customer) => customer.status !== 'Archived');
        setUnits(available);
        setCustomers(eligibleCustomers);
        setUnitId((current) => available.some((unit) => unit.id === current) ? current : (available[0]?.id ?? ''));
        setCustomerId((current) => eligibleCustomers.some((customer) => customer.id === current)
          ? current
          : (eligibleCustomers[0]?.id ?? ''));
      } else {
        setUnits([]);
        setCustomers([]);
      }
    } catch (loadError) {
      setError(errorText(loadError, language));
    } finally {
      setLoading(false);
    }
  }, [project.id, canManage, language]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const submitReservation = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
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
      setExpiresAtLocal(defaultExpiryLocal());
      await loadData();
    } catch (submitError) {
      setError(errorText(submitError, language));
    } finally {
      setSaving(false);
    }
  };

  const submitCancellation = async (event: FormEvent) => {
    event.preventDefault();
    if (!cancelTarget) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.cancelProjectSalesReservation(project.id, cancelTarget.id, {
        reason: cancelReason.trim(),
        expectedConcurrencyStamp: cancelTarget.concurrencyStamp,
      });
      setCancelTarget(null);
      setCancelReason('');
      await loadData();
    } catch (cancelError) {
      setError(errorText(cancelError, language));
    } finally {
      setSaving(false);
    }
  };

  const title = isArabic ? 'حجوزات المشروع' : 'Réservations du projet';

  return (
    <div
      className="fixed inset-0 z-[76] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-reservations-title"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
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
          <button type="button" onClick={onClose} aria-label={isArabic ? 'إغلاق' : 'Fermer'} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {error && <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}

          {canManage && (
            <form onSubmit={submitReservation} className="grid grid-cols-1 items-end gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <label className={labelClass}>
                <span>{isArabic ? 'الوحدة المتاحة *' : 'Unité disponible *'}</span>
                <select className={fieldClass} required value={unitId} onChange={(event) => setUnitId(event.target.value)}>
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
                <select className={fieldClass} required value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
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
                  onChange={(event) => setExpiresAtLocal(event.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={saving || !unitId || !customerId || !units.length || !customers.length}
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
                <button type="submit" disabled={saving || !cancelReason.trim()} className="rounded bg-amber-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {isArabic ? 'تأكيد الإلغاء' : 'Confirmer l’annulation'}
                </button>
                <button type="button" onClick={() => { setCancelTarget(null); setCancelReason(''); }} className="rounded border border-slate-300 px-3 py-2 text-xs text-slate-700">
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
              <button type="button" onClick={() => void loadData()} disabled={loading} className="text-xs font-medium text-teal-800 hover:underline disabled:opacity-50">
                {isArabic ? 'تحديث' : 'Actualiser'}
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {isArabic ? 'جارٍ التحميل...' : 'Chargement...'}
              </div>
            ) : reservations.length === 0 ? (
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
                        {canManage && (
                          <td className="px-3 py-2.5">
                            {reservation.status === 'Active' ? (
                              <button type="button" onClick={() => { setCancelTarget(reservation); setCancelReason(''); }} className="text-xs font-semibold text-amber-800 hover:underline">
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
      </div>
    </div>
  );
}
