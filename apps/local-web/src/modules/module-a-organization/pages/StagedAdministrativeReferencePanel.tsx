import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { apiClient, ApiError } from '@/core/api/apiClient';
import type { AppLanguage, StagedAdministrativeSnapshotDto, StagedAdministrativeCommunePageDto } from '@/types/erp';
import { ErrorBanner, LoadingSkeleton } from '@/shared/components/StateViews';
import { inputBaseClass } from '@/shared/components/FormField';

const snapshotPattern = /^sheets-sha256-[0-9a-f]{64}$/;
const buttonClass = 'rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50';

// Mounted only for an active system administrator; keyed by the current session identity/stamp.
export function StagedAdministrativeReferencePanel({ language }: { language: AppLanguage }) {
  const ar = language === 'ar';
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const [denied, setDenied] = useState(false);
  const onDenied = useCallback(() => setDenied(true), []);
  return <section className="space-y-4 rounded-xl border border-amber-300 bg-white p-5" dir={ar ? 'rtl' : 'ltr'}>
    <h2 className="font-bold">{ar ? 'فحص نسخة مرحلية — مدير النظام فقط' : 'Inspection d’une version préparée — administrateur système uniquement'}</h2>
    <p className="text-sm text-amber-900">{ar
      ? 'قراءة فقط، دون تفعيل. مطابقة الأعداد لا تثبت اعتماد المصدر أو الصلاحية القانونية. النماذج الحالية لا تستخدم هذه النسخة.'
      : 'Lecture seule, sans activation. Des comptes concordants ne prouvent ni la validation de la source ni sa validité juridique. Les formulaires actuels n’utilisent pas cette version.'}</p>
    {denied ? <ErrorBanner message={ar ? 'انتهت الجلسة أو لم تعد لديك صلاحية الفحص.' : 'Session expirée ou autorisation d’inspection retirée.'} /> : <>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event: FormEvent) => {
        event.preventDefault();
        const value = input.trim();
        setInvalid(!snapshotPattern.test(value));
        if (snapshotPattern.test(value)) { setSelected(value); setAttempt(n => n + 1); }
      }}>
        <label className="min-w-0 flex-1 text-sm">
          {ar ? 'معرّف النسخة الكامل من إيصال الاستيراد' : 'Identifiant complet fourni par le reçu d’import'}
          <input dir="ltr" className={inputBaseClass} value={input} maxLength={78} spellCheck={false}
            onChange={event => setInput(event.target.value)} aria-invalid={invalid} required />
        </label>
        <button type="submit" className={buttonClass}>{ar ? 'فحص النسخة' : 'Inspecter la version'}</button>
      </form>
      {invalid && <ErrorBanner message={ar ? 'أدخل sheets-sha256- متبوعًا بالبصمة الكاملة من 64 محرفًا صغيرًا.' : 'Saisissez sheets-sha256- suivi de l’empreinte complète de 64 caractères hexadécimaux minuscules.'} />}
      {selected && <SnapshotInspection key={`${selected}:${attempt}`} snapshotId={selected} language={language} onDenied={onDenied} />}
    </>}
  </section>;
}

function errorText(error: unknown, ar: boolean): string {
  if (error instanceof ApiError && error.status === 404)
    return ar ? 'النسخة غير موجودة أو أزيلت. تحقّق من إيصال الاستيراد.' : 'Version absente ou retirée. Vérifiez le reçu d’import.';
  return ar ? 'تعذر تحميل النسخة المرحلية. لم تُفعّل أي بيانات.' : 'Impossible de charger la version préparée. Aucune donnée n’a été activée.';
}

function SnapshotInspection({ snapshotId, language, onDenied }: {
  snapshotId: string; language: AppLanguage; onDenied: () => void;
}) {
  const ar = language === 'ar';
  const [snapshot, setSnapshot] = useState<StagedAdministrativeSnapshotDto | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);
  const onMissing = useCallback(() => {
    setSnapshot(null); setFailed(new ApiError(404, 'REFERENCE_SNAPSHOT_NOT_FOUND', ''));
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry is an explicit user-requested reload token.
  useEffect(() => {
    const controller = new AbortController();
    setSnapshot(null); setFailed(null);
    apiClient.getStagedAdministrativeSnapshot(snapshotId, controller.signal).then(value => {
      if (!controller.signal.aborted) setSnapshot(value);
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) onDenied();
      else setFailed(error);
    });
    return () => controller.abort();
  }, [snapshotId, retry, onDenied]);
  if (failed) return <ErrorBanner message={errorText(failed, ar)} actionLabel={ar ? 'إعادة المحاولة' : 'Réessayer'} onAction={() => setRetry(n => n + 1)} />;
  if (!snapshot) return <LoadingSkeleton rows={3} />;
  return <div className="space-y-4">
    <dl className="space-y-2 break-words text-sm">
      {[
        [ar ? 'معرّف النسخة' : 'Identifiant', snapshot.snapshotId],
        ['SHA-256 (content)', snapshot.canonicalContentSha256],
        ['SHA-256 (manifest)', snapshot.manifestSha256],
        [ar ? 'معرّف جدول المصدر' : 'Identifiant du classeur source', snapshot.sourceSpreadsheetId],
        [ar ? 'وقت الالتقاط المصرّح به (UTC)' : 'Capture déclarée (UTC)', snapshot.claimedCaptureAtUtc],
        [ar ? 'الولايات: مخزّن / مصرّح' : 'Wilayas : stockées / déclarées', `${snapshot.storedWilayaCount} / ${snapshot.declaredWilayaCount}`],
        [ar ? 'البلديات: مخزّن / مصرّح' : 'Communes : stockées / déclarées', `${snapshot.storedCommuneCount} / ${snapshot.declaredCommuneCount}`],
        [ar ? 'الأسماء البديلة: مخزّن / مصرّح' : 'Alias : stockés / déclarés', `${snapshot.storedAliasCount} / ${snapshot.declaredAliasCount}`],
        [ar ? 'الدوائر: ملاحظة / مسجلة / مصرّح بها' : 'Daïras : observées / enregistrées / déclarées', `${snapshot.storedObservedDairaCount} / ${snapshot.recordedObservedDairaCount} / ${snapshot.declaredDairaCount}`],
      ].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd dir="ltr" className="font-mono">{value}</dd></div>)}
    </dl>
    <p role="status" className={snapshot.countsMatchMetadata ? 'text-teal-800' : 'text-red-800'}>{snapshot.countsMatchMetadata
      ? (ar ? 'الأعداد المخزنة تطابق بيانات النسخة؛ ليست شهادة اعتماد أو تفعيل.' : 'Les comptes stockés concordent avec les métadonnées ; ce n’est ni une certification ni une activation.')
      : (ar ? 'تحذير: الأعداد المخزنة لا تطابق بيانات النسخة.' : 'Attention : les comptes stockés divergent des métadonnées.')}</p>
    <CommuneInspection snapshot={snapshot} language={language} onDenied={onDenied} onMissing={onMissing} />
  </div>;
}

function CommuneInspection({ snapshot, language, onDenied, onMissing }: {
  snapshot: StagedAdministrativeSnapshotDto; language: AppLanguage; onDenied: () => void; onMissing: () => void;
}) {
  const ar = language === 'ar';
  const [draft, setDraft] = useState('');
  const [filters, setFilters] = useState({ wilayaCode: '', query: '', page: 1 });
  const [result, setResult] = useState<StagedAdministrativeCommunePageDto | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  const [retry, setRetry] = useState(0);
  // Tag results with the exact query so old rows cannot appear under new filters.
  const requestKey = JSON.stringify(filters);
  const [resultKey, setResultKey] = useState('');
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry is an explicit user-requested reload token.
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setFailed(null);
    apiClient.getStagedAdministrativeCommunes(snapshot.snapshotId, filters, controller.signal).then(value => {
      if (!controller.signal.aborted) { setResult(value); setResultKey(requestKey); }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) onDenied();
      else if (error instanceof ApiError && error.status === 404) onMissing();
      else setFailed(error);
    });
    return () => controller.abort();
  }, [snapshot.snapshotId, filters, requestKey, retry, onDenied, onMissing]);
  const current = resultKey === requestKey ? result : null;
  const unknown = ar ? 'غير معلوم' : 'Inconnu';
  return <div className="space-y-3">
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setFilters(f => ({ ...f, query: draft.trim(), page: 1 })); }}>
      <label className="text-sm">{ar ? 'الولاية' : 'Wilaya'}
        <select className={inputBaseClass} value={filters.wilayaCode} onChange={event => setFilters(f => ({ ...f, wilayaCode: event.target.value, page: 1 }))}>
          <option value="">{ar ? 'كل الولايات' : 'Toutes les wilayas'}</option>
          {snapshot.wilayas.map(w => <option key={w.id} value={w.code}>{w.code} — {ar ? w.nameAr : w.nameFr}</option>)}
        </select>
      </label>
      <label className="flex-1 text-sm">{ar ? 'بحث بالرمز أو الاسم أو الدائرة أو الاسم البديل' : 'Recherche : code, nom, daïra ou alias'}
        <input className={inputBaseClass} value={draft} maxLength={100} onChange={event => setDraft(event.target.value)} />
      </label>
      <button type="submit" className={buttonClass}>{ar ? 'بحث' : 'Rechercher'}</button>
    </form>
    {failed ? <ErrorBanner message={errorText(failed, ar)} actionLabel={ar ? 'إعادة المحاولة' : 'Réessayer'} onAction={() => setRetry(n => n + 1)} /> : !current ? <LoadingSkeleton rows={4} /> : <>
      <p role="status">{ar ? 'النتائج' : 'Résultats'}: {current.totalCount} — {ar ? 'الصفحة' : 'Page'} {current.page} / {Math.max(1, current.totalPages)}</p>
      {current.items.length === 0 && <p>{ar ? 'لا توجد بلديات مطابقة.' : 'Aucune commune correspondante.'}</p>}
      <div className="overflow-x-auto"><table className="w-full text-start text-sm">
        <caption className="sr-only">{ar ? 'بلديات النسخة المرحلية' : 'Communes de la version préparée'}</caption>
        <thead><tr>{(ar ? ['الرمز / الهوية', 'الأسماء الأصلية', 'الدائرة / المقر', 'تبعية الولاية', 'الأسماء البديلة / الدليل'] : ['Code / identité', 'Noms originaux', 'Daïra / siège', 'Rattachement wilaya', 'Alias / preuve']).map(label => <th key={label} scope="col" className="p-2 text-start">{label}</th>)}</tr></thead>
        <tbody>{current.items.map(c => <tr key={c.id} className="border-t align-top">
          <td className="p-2"><span dir="ltr">{c.code}</span><small className="block" dir="ltr">{c.id}</small></td>
          <td className="p-2"><div lang="ar" dir="rtl">{c.nameAr}</div><div lang="fr" dir="ltr">{c.nameFr}</div></td>
          <td className="p-2"><div lang="ar" dir="rtl">{c.dairaNameAr}</div><div lang="fr" dir="ltr">{c.dairaNameFr}</div>{ar ? 'مقر الدائرة' : 'Siège'}: {c.isDairaSeat === null ? unknown : c.isDairaSeat ? (ar ? 'نعم' : 'Oui') : (ar ? 'لا' : 'Non')}</td>
          <td className="p-2"><div dir="ltr">{c.wilayaCode}</div><small className="block" dir="ltr">{c.wilayaId}</small><div>{ar ? 'من' : 'Du'}: {c.parentEffectiveFrom ?? unknown} — {ar ? 'إلى' : 'au'}: {c.parentEffectiveTo ?? unknown}</div><div>{ar ? 'دليل التاريخ' : 'Preuve des dates'}: {c.parentDateEvidence ?? unknown}</div></td>
          <td className="p-2">{c.alias ? <dl>{[
            [ar ? 'العربية الأصلية' : 'Arabe de référence', c.alias.referenceNameAr],
            [ar ? 'الفرنسية الأصلية' : 'Français de référence', c.alias.referenceNameFr],
            [ar ? 'الاسم الفرنسي البديل' : 'Alias français', c.alias.aliasNameFr],
            [ar ? 'العربية في المستودع' : 'Arabe du dépôt', c.alias.repositoryNameAr],
            [ar ? 'الدليل' : 'Preuve', c.alias.evidence],
          ].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd>{value}</dd></div>)}</dl> : (ar ? 'لا يوجد اسم بديل مسجل' : 'Aucun alias enregistré')}</td>
        </tr>)}</tbody>
      </table></div>
      <nav className="flex gap-3" aria-label={ar ? 'صفحات البلديات' : 'Pagination des communes'}>
        <button type="button" className={buttonClass} disabled={current.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}>{ar ? 'السابق' : 'Précédent'}</button>
        <button type="button" className={buttonClass} disabled={current.page >= current.totalPages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}>{ar ? 'التالي' : 'Suivant'}</button>
      </nav>
    </>}
  </div>;
}
