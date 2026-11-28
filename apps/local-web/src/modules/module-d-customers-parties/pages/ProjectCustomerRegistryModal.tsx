import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, LoaderCircle, Plus, Search, UserRound, X } from 'lucide-react';
import type {
  AppLanguage,
  CreateProjectCustomerRequest,
  ProjectCustomerDto,
  ProjectCustomerListItemDto,
  PartyDirectoryItemDto,
  ProjectDocumentDto,
  ProjectDto,
  UpdateProjectCustomerRequest,
} from '@/types/erp';
import { apiClient, ApiError } from '@/core/api/apiClient';
import { translateApiError } from '@/core/localization/translations';
import { Modal } from '@/shared/components/Modal';
import { ConfirmDialog } from '@/shared/components/StateViews';

interface ProjectCustomerRegistryModalProps {
  project: ProjectDto;
  language: AppLanguage;
  canManage: boolean;
  canReadPartyDirectory: boolean;
  canManagePartyIdentity: boolean;
  mode?: 'modal' | 'embedded';
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

type RegistryAction =
  | { kind: 'close' }
  | { kind: 'subView'; target: 'registry' | 'pipelinePlanned' }
  | { kind: 'customer'; customerId: string }
  | { kind: 'new' | 'edit' | 'dismissForm' };

interface CustomerFormState {
  partyId: string;
  customerType: string;
  displayName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  preferredLanguage: AppLanguage;
  source: string;
  status: string;
  identityDocumentStoredFileId: string;
}

const emptyForm = (language: AppLanguage): CustomerFormState => ({
  partyId: '',
  customerType: 'Individual',
  displayName: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  preferredLanguage: language,
  source: 'WalkIn',
  status: 'Prospect',
  identityDocumentStoredFileId: '',
});

function errorText(error: unknown, language: AppLanguage): string {
  if (error instanceof ApiError) return translateApiError(error.code, error.message, language);
  return language === 'ar' ? 'تعذر إتمام العملية على الخادم المحلي.' : 'Impossible de terminer l’opération sur le serveur local.';
}

function formatDate(value: string, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusLabel(value: string, language: AppLanguage): string {
  const labels: Record<string, { ar: string; fr: string }> = {
    Prospect: { ar: 'مهتم / محتمل', fr: 'Prospect' },
    Qualified: { ar: 'مهتم مؤهل', fr: 'Prospect qualifié' },
    Customer: { ar: 'زبون', fr: 'Client' },
    Archived: { ar: 'مؤرشف', fr: 'Archivé' },
  };
  return labels[value]?.[language] ?? value;
}

function sourceLabel(value: string, language: AppLanguage): string {
  const labels: Record<string, { ar: string; fr: string }> = {
    WalkIn: { ar: 'زيارة مباشرة', fr: 'Visite directe' },
    Phone: { ar: 'اتصال هاتفي', fr: 'Téléphone' },
    Referral: { ar: 'توصية', fr: 'Recommandation' },
    Website: { ar: 'الموقع الإلكتروني', fr: 'Site web' },
    SocialMedia: { ar: 'الشبكات الاجتماعية', fr: 'Réseaux sociaux' },
    Other: { ar: 'أخرى', fr: 'Autre' },
  };
  return labels[value]?.[language] ?? value;
}

function interactionLabel(value: string, language: AppLanguage): string {
  const labels: Record<string, { ar: string; fr: string }> = {
    Call: { ar: 'مكالمة', fr: 'Appel' },
    Email: { ar: 'بريد إلكتروني', fr: 'E-mail' },
    Meeting: { ar: 'اجتماع', fr: 'Réunion' },
    Visit: { ar: 'زيارة', fr: 'Visite' },
    Note: { ar: 'ملاحظة', fr: 'Note' },
  };
  return labels[value]?.[language] ?? value;
}

const inputClass = 'w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700';
const labelClass = 'block space-y-1.5 text-xs font-medium text-slate-700';

export function ProjectCustomerRegistryModal({
  project,
  language,
  canManage,
  canReadPartyDirectory,
  canManagePartyIdentity,
  mode = 'modal',
  onClose,
  onDirtyChange,
}: ProjectCustomerRegistryModalProps) {
  const isArabic = language === 'ar';
  const [subView, setSubView] = useState<'registry' | 'pipelinePlanned'>('registry');
  const [customers, setCustomers] = useState<ProjectCustomerListItemDto[]>([]);
  const [documents, setDocuments] = useState<ProjectDocumentDto[]>([]);
  const [details, setDetails] = useState<ProjectCustomerDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interactionSaving, setInteractionSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hasFormEdits, setHasFormEdits] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CustomerFormState>(() => emptyForm(language));
  const [partyQuery, setPartyQuery] = useState('');
  const [partyResults, setPartyResults] = useState<PartyDirectoryItemDto[]>([]);
  const [selectedParty, setSelectedParty] = useState<PartyDirectoryItemDto | null>(null);
  const [partySearching, setPartySearching] = useState(false);
  const [interactionType, setInteractionType] = useState('Call');
  const [interactionSubject, setInteractionSubject] = useState('');
  const [interactionSummary, setInteractionSummary] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<RegistryAction | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [requestedCustomerId, setRequestedCustomerId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registryQuery, setRegistryQuery] = useState('');
  const [registryStatus, setRegistryStatus] = useState('');
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const partyRequest = useRef(0);
  const lifetime = useRef<object | null>(null);
  const busy = saving || interactionSaving;
  const normalizedQuery = registryQuery.trim().normalize('NFKC').toLocaleLowerCase();
  const visibleCustomers = customers.filter((customer) =>
    (!registryStatus || customer.status === registryStatus) &&
    (!normalizedQuery || [customer.displayName, customer.contactPerson, customer.phone, customer.email]
      .some((value) => value?.normalize('NFKC').toLocaleLowerCase().includes(normalizedQuery))));

  const isDirty =
    (showForm && hasFormEdits) ||
    interactionType !== 'Call' ||
    interactionSubject.trim() !== '' ||
    interactionSummary.trim() !== '' ||
    nextFollowUp.trim() !== '';

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const discardDrafts = () => {
    ++detailRequest.current;
    ++partyRequest.current;
    setDetailsLoading(false);
    setPartySearching(false);
    setPartyResults([]);
    setShowForm(false);
    setHasFormEdits(false);
    setEditing(false);
    setInteractionSubject('');
    setInteractionSummary('');
    setNextFollowUp('');
    setInteractionType('Call');
  };

  const performAction = (action: RegistryAction) => {
    discardDrafts();
    setError(null);
    setSuccess(null);
    setDetailsError(null);
    if (action.kind === 'close') onClose?.();
    else if (action.kind === 'subView') setSubView(action.target);
    else if (action.kind === 'customer') void openDetails(action.customerId);
    else if (action.kind === 'new') openNewForm();
    else if (action.kind === 'edit') openEditForm();
  };

  const requestAction = (action: RegistryAction) => {
    if (busy) return;
    if (isDirty) setPendingAction(action);
    else performAction(action);
  };

  const requestClose = () => requestAction({ kind: 'close' });
  const requestSwitchSubView = (target: 'registry' | 'pipelinePlanned') => {
    if (target !== subView) requestAction({ kind: 'subView', target });
  };

  const loadCustomers = useCallback(async () => {
    const request = ++listRequest.current;
    setLoading(true);
    setListError(null);
    try {
      const result = await apiClient.listProjectCustomers(project.id);
      if (request !== listRequest.current) return;
      setCustomers(result);
      if (canManage) {
        try {
          const projectDocuments = await apiClient.listProjectDocuments(project.id);
          if (request === listRequest.current) setDocuments(projectDocuments);
        } catch {
          if (request === listRequest.current) setDocuments([]);
        }
      } else {
        setDocuments([]);
      }
    } catch (err) {
      if (request === listRequest.current) setListError(errorText(err, language));
    } finally {
      if (request === listRequest.current) setLoading(false);
    }
  }, [project.id, canManage, language]);

  useEffect(() => {
    lifetime.current = {};
    setSaving(false);
    setInteractionSaving(false);
    void loadCustomers();
    return () => {
      lifetime.current = null;
      ++listRequest.current;
      ++detailRequest.current;
      ++partyRequest.current;
    };
  }, [loadCustomers]);

  const openDetails = async (customerId: string) => {
    const request = ++detailRequest.current;
    setRequestedCustomerId(customerId);
    setDetailsLoading(true);
    setDetailsError(null);
    setError(null);
    try {
      const result = await apiClient.getProjectCustomer(project.id, customerId);
      if (request !== detailRequest.current) return;
      setDetails(result);
      setShowForm(false);
      setHasFormEdits(false);
      setEditing(false);
    } catch (err) {
      if (request === detailRequest.current) {
        setDetails(null);
        setDetailsError(errorText(err, language));
      }
    } finally {
      if (request === detailRequest.current) setDetailsLoading(false);
    }
  };

  const openNewForm = () => {
    setForm(emptyForm(language));
    setPartyQuery('');
    setPartyResults([]);
    setSelectedParty(null);
    setEditing(false);
    setHasFormEdits(false);
    setShowForm(true);
    setError(null);
  };

  const openEditForm = () => {
    if (!details) return;
    setPartyQuery('');
    setPartyResults([]);
    setSelectedParty(null);
    setForm({
      partyId: details.partyId ?? '',
      customerType: details.customerType,
      displayName: details.displayName,
      contactPerson: details.contactPerson ?? '',
      phone: details.phone,
      email: details.email ?? '',
      address: details.address ?? '',
      preferredLanguage: details.preferredLanguage,
      source: details.source,
      status: details.status,
      identityDocumentStoredFileId: details.identityDocument?.id ?? '',
    });
    setEditing(true);
    setHasFormEdits(false);
    setShowForm(true);
    setError(null);
  };

  const searchPartyDirectory = async () => {
    if (!canReadPartyDirectory || busy) return;
    const request = ++partyRequest.current;
    const query = partyQuery.trim();
    if (query.length < 2) {
      setError(isArabic ? 'أدخل حرفين على الأقل للبحث في دليل الأطراف.' : 'Saisissez au moins deux caractères pour rechercher un tiers.');
      return;
    }

    setError(null);
    setPartySearching(true);
    try {
      const results = await apiClient.searchPartyDirectory(query);
      if (request === partyRequest.current) setPartyResults(results);
    } catch (err) {
      if (request !== partyRequest.current) return;
      setPartyResults([]);
      setError(errorText(err, language));
    } finally {
      if (request === partyRequest.current) setPartySearching(false);
    }
  };

  const chooseParty = (party: PartyDirectoryItemDto) => {
    ++partyRequest.current;
    setPartySearching(false);
    setSelectedParty(party);
    setHasFormEdits(true);
    setForm((current) => ({
      ...current,
      partyId: party.id,
      customerType: party.kind === 'Person' ? 'Individual' : 'LegalEntity',
      displayName: party.displayName,
    }));
    setPartyResults([]);
  };

  const clearSelectedParty = () => {
    setSelectedParty(null);
    setHasFormEdits(true);
    setForm((current) => ({ ...current, partyId: '' }));
  };

  const submitCustomer = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || busy || detailsLoading) return;
    const scope = lifetime.current;
    setError(null);
    setSuccess(null);
    setSaving(true);

    const common = {
      customerType: form.customerType,
      displayName: form.displayName.trim(),
      contactPerson: form.contactPerson.trim() || null,
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      preferredLanguage: form.preferredLanguage,
      source: form.source,
      identityDocumentStoredFileId: form.identityDocumentStoredFileId || null,
    };

    try {
      let saved: ProjectCustomerDto;
      if (editing && details) {
        const updatePayload: UpdateProjectCustomerRequest = {
          ...common,
          status: form.status,
          concurrencyStamp: details.concurrencyStamp,
          partyConcurrencyStamp: details.partyConcurrencyStamp,
        };
        saved = await apiClient.updateProjectCustomer(project.id, details.id, updatePayload);
      } else {
        const createPayload: CreateProjectCustomerRequest = {
          ...common,
          partyId: form.partyId || null,
        };
        saved = await apiClient.createProjectCustomer(project.id, createPayload);
      }

      if (scope !== lifetime.current) return;
      setDetails(saved);
      setSuccess(isArabic ? 'تم حفظ السجل على الخادم.' : 'Le client a été enregistré sur le serveur.');
      setShowForm(false);
      setHasFormEdits(false);
      setEditing(false);
      await loadCustomers();
    } catch (err) {
      if (scope === lifetime.current) setError(errorText(err, language));
    } finally {
      if (scope === lifetime.current) setSaving(false);
    }
  };

  const submitInteraction = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || busy || detailsLoading || !details || !interactionSubject.trim() || !interactionSummary.trim()) return;
    const scope = lifetime.current;
    setError(null);
    setSuccess(null);
    setInteractionSaving(true);
    try {
      await apiClient.addCustomerInteraction(project.id, details.id, {
        type: interactionType,
        subject: interactionSubject.trim(),
        summary: interactionSummary.trim(),
        nextFollowUpAtUtc: nextFollowUp
          ? new Date(`${nextFollowUp}T12:00:00`).toISOString()
          : null,
      });
      if (scope !== lifetime.current) return;
      setInteractionSubject('');
      setInteractionSummary('');
      setNextFollowUp('');
      setInteractionType('Call');
      setSuccess(isArabic ? 'تم تسجيل المتابعة على الخادم. لا تُعد إرسالها إذا تعذر تحديث العرض.' : 'Le suivi a été enregistré sur le serveur. Ne le renvoyez pas si le rechargement échoue.');
      await openDetails(details.id);
      await loadCustomers();
    } catch (err) {
      if (scope === lifetime.current) setError(errorText(err, language));
    } finally {
      if (scope === lifetime.current) setInteractionSaving(false);
    }
  };

  const downloadIdentityDocument = async () => {
    if (!details?.identityDocument) return;
    try {
      const blob = await apiClient.downloadProjectDocument(project.id, details.identityDocument.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = details.identityDocument.originalFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      setError(errorText(err, language));
    }
  };

  const title = isArabic ? 'سجل الزبائن والمهتمين' : 'Clients et prospects';
  const noSelection = isArabic
    ? 'اختر زبوناً من القائمة لعرض بيانات الاتصال وسجل المتابعة.'
    : 'Sélectionnez un client pour consulter ses coordonnées et son historique.';

  const registryContent = (
    <>
      {mode === 'embedded' && (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 px-4 pt-3 bg-slate-50/70">
          <button
            type="button"
            disabled={busy} onClick={() => requestSwitchSubView('registry')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              subView === 'registry'
                ? 'border-teal-800 text-teal-900 bg-white rounded-t'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {isArabic ? 'سجل الزبائن والمهتمين' : 'Registre clients & prospects'}
          </button>
          <button
            type="button"
            disabled={busy} onClick={() => requestSwitchSubView('pipelinePlanned')}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              subView === 'pipelinePlanned'
                ? 'border-teal-800 text-teal-900 bg-white rounded-t'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {isArabic ? 'مسار الفرص التجارية (مخطط)' : 'Pipeline commercial (Planifié)'}
          </button>
        </div>
      )}

      {mode === 'embedded' && subView === 'pipelinePlanned' ? (
        <div className="p-5 text-xs text-slate-600">
          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-4 text-amber-950 space-y-1.5">
            <div className="font-bold">
              {isArabic ? 'مسار الفرص التجارية (CRM Pipeline) — مخطط' : 'Pipeline commercial multi-étapes — Planifié'}
            </div>
            <p className="leading-relaxed">
              {isArabic
                ? 'سيتيح هذا المسار تتبع تحويل المهتمين المؤهلين نحو الحجوزات الداخلية ثم العقود القانونية، مع إحصائيات حقيقية من قاعدة البيانات بمجرد تفعيل مراحل البيع.'
                : 'Ce pipeline assurera le suivi de conversion des prospects qualifiés vers les réservations internes puis les contrats légaux dès l’ouverture du socle commercial.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {error && <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{error}</div>}
          {success && <p role="status" className="rounded border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-950">{success}</p>}
          {listError && <div role="alert" className="space-y-2 text-xs text-red-800"><p>{listError}</p>
            <button type="button" disabled={busy || loading} onClick={() => void loadCustomers()} className="rounded border px-3 py-2">
              {isArabic ? 'إعادة تحميل السجلات' : 'Recharger le registre'}
            </button></div>}

          <div className="grid min-h-[26rem] grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.5fr)]">
            <section className="space-y-3 rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {isArabic ? 'قائمة السجلات' : 'Registre'} ({customers.length})
                </h3>
                {canManage && (
                  <button type="button" disabled={busy} onClick={() => requestAction({ kind: 'new' })} className="inline-flex items-center gap-1 rounded bg-teal-800 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-900">
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    {isArabic ? 'إضافة' : 'Ajouter'}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <input type="search" aria-label={isArabic ? 'بحث في السجلات المحملة' : 'Rechercher dans les clients chargés'}
                  placeholder={isArabic ? 'الاسم، الهاتف، البريد...' : 'Nom, téléphone, e-mail...'}
                  value={registryQuery} onChange={(event) => setRegistryQuery(event.target.value)} className={inputClass} />
                <select aria-label={isArabic ? 'تصفية حالة الزبون' : 'Filtrer par statut client'}
                  value={registryStatus} onChange={(event) => setRegistryStatus(event.target.value)} className={inputClass}>
                  <option value="">{isArabic ? 'كل الحالات' : 'Tous les statuts'}</option>
                  {['Prospect', 'Qualified', 'Customer', 'Archived'].map((status) => <option key={status} value={status}>{statusLabel(status, language)}</option>)}
                </select>
                <p aria-live="polite" className="text-[11px] text-slate-500">{isArabic ? `عرض ${visibleCustomers.length} من ${customers.length}` : `${visibleCustomers.length} sur ${customers.length}`}</p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  {isArabic ? 'جارٍ التحميل...' : 'Chargement...'}
                </div>
              ) : listError ? null : visibleCustomers.length === 0 ? (
                <div className="rounded border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-500">
                  {registryQuery || registryStatus
                    ? (isArabic ? 'لا توجد سجلات تطابق البحث والتصفية.' : 'Aucun client ne correspond aux filtres.')
                    : (isArabic ? 'لا توجد سجلات زبائن لهذا المشروع.' : 'Aucun client enregistré pour ce projet.')}
                  {(registryQuery || registryStatus) && <button type="button" onClick={() => { setRegistryQuery(''); setRegistryStatus(''); }} className="mt-2 block w-full font-semibold">{isArabic ? 'مسح التصفية' : 'Effacer les filtres'}</button>}
                </div>
              ) : (
                <div className="max-h-[62vh] space-y-2 overflow-y-auto">
                  {visibleCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      disabled={busy} onClick={() => requestAction({ kind: 'customer', customerId: customer.id })}
                      className={`w-full rounded border px-3 py-2.5 text-start transition hover:border-teal-500 hover:bg-teal-50/50 ${details?.id === customer.id ? 'border-teal-700 bg-teal-50' : 'border-slate-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="break-words text-xs font-semibold text-slate-900">{customer.displayName}</span>
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{statusLabel(customer.status, language)}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600" dir="ltr">{customer.phone}</div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-400">
                        <span>{customer.interactionCount} {isArabic ? 'متابعة' : 'échanges'}</span>
                        {customer.hasIdentityDocument && <span>{isArabic ? 'وثيقة مرتبطة' : 'Pièce liée'}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="min-w-0 space-y-4 rounded-md border border-slate-200 p-3 sm:p-4">
              {detailsLoading ? (
                <p role="status" aria-busy="true" className="py-8 text-center text-xs text-slate-600">{isArabic ? 'جارٍ تحميل بيانات الزبون...' : 'Chargement du client...'}</p>
              ) : detailsError ? (
                <div role="alert" className="space-y-2 text-xs text-red-800">
                  <p>{detailsError}</p>
                  <button type="button" onClick={() => requestedCustomerId && void openDetails(requestedCustomerId)} className="rounded border px-3 py-2">
                    {isArabic ? 'إعادة تحميل الزبون' : 'Recharger le client'}
                  </button>
                </div>
              ) : showForm && canManage ? (
                <form onSubmit={submitCustomer} onChange={() => setHasFormEdits(true)} className="space-y-3">
                  <fieldset disabled={busy} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      {editing
                        ? (isArabic ? 'تعديل بيانات الزبون' : 'Modifier le client')
                        : (isArabic ? 'إضافة زبون أو مهتم' : 'Ajouter un client ou prospect')}
                    </h3>
                    <button type="button" disabled={busy} onClick={() => requestAction({ kind: 'dismissForm' })} className="text-xs text-slate-500 hover:underline">
                      {isArabic ? 'إلغاء' : 'Annuler'}
                    </button>
                  </div>

                  {!editing && canReadPartyDirectory && (
                    <section className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold text-slate-800">
                        {isArabic ? 'إعادة استخدام هوية مسجلة في المؤسسة' : 'Réutiliser une identité du répertoire'}
                      </div>
                      {selectedParty ? (
                        <div className="flex items-center justify-between gap-3 rounded border border-teal-200 bg-white px-3 py-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-slate-900">{selectedParty.displayName}</div>
                            <div className="text-[10px] text-slate-500">
                              {selectedParty.kind === 'Person'
                                ? (isArabic ? 'شخص طبيعي' : 'Personne physique')
                                : (isArabic ? 'شخص معنوي' : 'Personne morale')}
                            </div>
                          </div>
                          <button type="button" onClick={clearSelectedParty} className="shrink-0 text-xs font-semibold text-rose-700 hover:underline">
                            {isArabic ? 'إلغاء الربط' : 'Dissocier'}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <input
                              className={inputClass}
                              value={partyQuery}
                              onChange={(e) => { ++partyRequest.current; setPartySearching(false); setPartyResults([]); setPartyQuery(e.target.value); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void searchPartyDirectory(); } }}
                              maxLength={100}
                              placeholder={isArabic ? 'ابحث بالاسم القانوني...' : 'Rechercher par nom...'}
                            />
                            <button type="button" disabled={partySearching || partyQuery.trim().length < 2} onClick={() => void searchPartyDirectory()} className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                              {partySearching ? <LoaderCircle className="h-3.5 w-3.5 animate-spin"/> : <Search className="h-3.5 w-3.5"/>}
                              {isArabic ? 'بحث' : 'Rechercher'}
                            </button>
                          </div>
                          {partyResults.length > 0 && (
                            <div className="max-h-36 space-y-1 overflow-y-auto rounded border border-slate-200 bg-white p-1">
                              {partyResults.map((party) => (
                                <button key={party.id} type="button" onClick={() => chooseParty(party)} className="flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-start text-xs hover:bg-teal-50">
                                  <span className="font-medium text-slate-800">{party.displayName}</span>
                                  <span className="shrink-0 text-[10px] text-slate-500">{party.kind === 'Person' ? (isArabic ? 'شخص' : 'Personne') : (isArabic ? 'مؤسسة' : 'Société')}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          <p className="text-[10px] text-slate-500">
                            {isArabic
                              ? 'سيتم ربط سجل هذا المشروع بالهوية فقط؛ تبقى بيانات الاتصال والمتابعات خاصة بالمشروع.'
                              : 'Seule l’identité est partagée ; les coordonnées et suivis restent propres au projet.'}
                          </p>
                        </>
                      )}
                    </section>
                  )}

                  {editing && !canManagePartyIdentity && (
                    <p className="rounded bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
                      {isArabic
                        ? 'اسم ونوع الطرف هوية مؤسسية مشتركة؛ تعديلها يتطلب صلاحية إدارة الهوية المركزية.'
                        : 'Le nom et le type sont une identité partagée ; leur modification exige le droit de gestion centralisée.'}
                    </p>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className={labelClass}>
                      <span>{isArabic ? 'نوع الزبون' : 'Type de client'}</span>
                      <select disabled={editing && !canManagePartyIdentity} className={inputClass} value={form.customerType} onChange={(e) => setForm((current) => ({ ...current, customerType: e.target.value }))}>
                        <option value="Individual">{isArabic ? 'شخص طبيعي' : 'Personne physique'}</option>
                        <option value="LegalEntity">{isArabic ? 'شخص معنوي / مؤسسة' : 'Personne morale / société'}</option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      <span>{isArabic ? 'الاسم الكامل أو التسمية القانونية *' : 'Nom complet ou raison sociale *'}</span>
                      <input required maxLength={200} readOnly={(editing && !canManagePartyIdentity) || Boolean(selectedParty)} className={inputClass} value={form.displayName} onChange={(e) => setForm((current) => ({ ...current, displayName: e.target.value }))} />
                    </label>
                    <label className={labelClass}>
                      <span>{isArabic ? 'الشخص المسؤول عن الاتصال' : 'Personne à contacter'}</span>
                      <input maxLength={150} className={inputClass} value={form.contactPerson} onChange={(e) => setForm((current) => ({ ...current, contactPerson: e.target.value }))} />
                    </label>
                    <label className={labelClass}>
                      <span>{isArabic ? 'رقم الهاتف الأساسي *' : 'Téléphone principal *'}</span>
                      <input required type="tel" maxLength={40} dir="ltr" className={inputClass} value={form.phone} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} />
                    </label>
                    <label className={labelClass}>
                      <span>{isArabic ? 'البريد الإلكتروني' : 'E-mail'}</span>
                      <input type="email" maxLength={254} dir="ltr" className={inputClass} value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
                    </label>
                    <label className={labelClass}>
                      <span>{isArabic ? 'اللغة المفضلة' : 'Langue préférée'}</span>
                      <select className={inputClass} value={form.preferredLanguage} onChange={(e) => setForm((current) => ({ ...current, preferredLanguage: e.target.value as AppLanguage }))}>
                        <option value="ar">العربية</option>
                        <option value="fr">Français</option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      <span>{isArabic ? 'مصدر التعرف' : 'Source du contact'}</span>
                      <select className={inputClass} value={form.source} onChange={(e) => setForm((current) => ({ ...current, source: e.target.value }))}>
                        <option value="WalkIn">{isArabic ? 'زيارة مباشرة' : 'Visite directe'}</option>
                        <option value="Phone">{isArabic ? 'اتصال هاتفي' : 'Téléphone'}</option>
                        <option value="Referral">{isArabic ? 'توصية' : 'Recommandation'}</option>
                        <option value="Website">{isArabic ? 'الموقع الإلكتروني' : 'Site web'}</option>
                        <option value="SocialMedia">{isArabic ? 'الشبكات الاجتماعية' : 'Réseaux sociaux'}</option>
                        <option value="Other">{isArabic ? 'أخرى' : 'Autre'}</option>
                      </select>
                    </label>
                    {editing && (
                      <label className={labelClass}>
                        <span>{isArabic ? 'حالة السجل' : 'Statut du dossier'}</span>
                        <select className={inputClass} value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))}>
                          <option value="Prospect">{statusLabel('Prospect', language)}</option>
                          <option value="Qualified">{statusLabel('Qualified', language)}</option>
                          <option value="Customer">{statusLabel('Customer', language)}</option>
                          <option value="Archived">{statusLabel('Archived', language)}</option>
                        </select>
                      </label>
                    )}
                  </div>

                  <label className={labelClass}>
                    <span>{isArabic ? 'العنوان' : 'Adresse'}</span>
                    <input maxLength={300} className={inputClass} value={form.address} onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))} />
                  </label>

                  <label className={labelClass}>
                    <span>{isArabic ? 'وثيقة الهوية المرتبطة (من وثائق المشروع)' : 'Pièce d’identité (documents du projet)'}</span>
                    <select className={inputClass} value={form.identityDocumentStoredFileId} onChange={(e) => setForm((current) => ({ ...current, identityDocumentStoredFileId: e.target.value }))}>
                      <option value="">{isArabic ? 'بدون وثيقة مرتبطة' : 'Aucune pièce liée'}</option>
                      {documents.map((document) => (
                        <option key={document.id} value={document.id}>{document.originalFileName} · {document.category}</option>
                      ))}
                    </select>
                    <span className="text-[10px] font-normal text-slate-500">
                      {isArabic
                        ? 'يتم ربط ملف موجود في مستندات هذا المشروع فقط. لا يخزن النظام رقم بطاقة الهوية في حقل مستقل.'
                        : 'Seul un fichier déjà présent dans ce projet peut être lié. Le numéro de pièce n’est pas stocké dans un champ séparé.'}
                    </span>
                  </label>

                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                    <button type="button" disabled={busy} onClick={() => requestAction({ kind: 'dismissForm' })} className="rounded border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                      {isArabic ? 'إلغاء' : 'Annuler'}
                    </button>
                    <button type="submit" disabled={busy} className="rounded bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50">
                      {saving
                        ? (isArabic ? 'جارٍ الحفظ...' : 'Enregistrement...')
                        : (isArabic ? 'حفظ السجل' : 'Enregistrer')}
                    </button>
                  </div>
                  </fieldset>
                </form>
              ) : details ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{details.displayName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {details.customerType === 'Individual'
                          ? (isArabic ? 'شخص طبيعي' : 'Personne physique')
                          : (isArabic ? 'شخص معنوي / مؤسسة' : 'Personne morale / société')}
                        {' · '}{statusLabel(details.status, language)}
                      </div>
                    </div>
                    {canManage && (
                      <button type="button" disabled={busy} onClick={() => requestAction({ kind: 'edit' })} className="rounded border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        {isArabic ? 'تعديل البيانات' : 'Modifier'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                    <div><span className="text-slate-500">{isArabic ? 'الهاتف: ' : 'Téléphone : '}</span><strong dir="ltr">{details.phone}</strong></div>
                    <div><span className="text-slate-500">{isArabic ? 'البريد: ' : 'E-mail : '}</span><strong className="break-all">{details.email ?? '—'}</strong></div>
                    <div><span className="text-slate-500">{isArabic ? 'مسؤول الاتصال: ' : 'Contact : '}</span><strong>{details.contactPerson ?? '—'}</strong></div>
                    <div><span className="text-slate-500">{isArabic ? 'المصدر: ' : 'Source : '}</span><strong>{sourceLabel(details.source, language)}</strong></div>
                    <div className="sm:col-span-2"><span className="text-slate-500">{isArabic ? 'العنوان: ' : 'Adresse : '}</span><strong>{details.address ?? '—'}</strong></div>
                  </div>

                  {details.identityDocument && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800">{details.identityDocument.originalFileName}</div>
                        <div className="text-[10px] text-slate-500">{details.identityDocument.category}</div>
                      </div>
                      <button type="button" onClick={() => void downloadIdentityDocument()} className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50">
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {isArabic ? 'تنزيل الوثيقة' : 'Télécharger'}
                      </button>
                    </div>
                  )}

                  {canManage && (
                    <form onSubmit={submitInteraction} className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
                      <fieldset disabled={busy} className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-900">{isArabic ? 'تسجيل اتصال أو متابعة جديدة' : 'Ajouter une communication ou un suivi'}</h4>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className={labelClass}>
                          <span>{isArabic ? 'النوع' : 'Type'}</span>
                          <select className={inputClass} value={interactionType} onChange={(e) => setInteractionType(e.target.value)}>
                            <option value="Call">{interactionLabel('Call', language)}</option>
                            <option value="Email">{interactionLabel('Email', language)}</option>
                            <option value="Meeting">{interactionLabel('Meeting', language)}</option>
                            <option value="Visit">{interactionLabel('Visit', language)}</option>
                            <option value="Note">{interactionLabel('Note', language)}</option>
                          </select>
                        </label>
                        <label className={labelClass}>
                          <span>{isArabic ? 'موعد المتابعة القادم' : 'Prochain suivi'}</span>
                          <input type="date" className={inputClass} value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} />
                        </label>
                      </div>
                      <label className={labelClass}>
                        <span>{isArabic ? 'موضوع الاتصال *' : 'Objet *'}</span>
                        <input required maxLength={120} className={inputClass} value={interactionSubject} onChange={(e) => setInteractionSubject(e.target.value)} />
                      </label>
                      <label className={labelClass}>
                        <span>{isArabic ? 'ملخص ما تم *' : 'Résumé *'}</span>
                        <textarea required maxLength={1500} rows={2} className={inputClass} value={interactionSummary} onChange={(e) => setInteractionSummary(e.target.value)} />
                      </label>
                      <div className="flex justify-end">
                        <button type="submit" disabled={busy} className="rounded bg-teal-800 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50">
                          {interactionSaving
                            ? (isArabic ? 'جارٍ التسجيل...' : 'Enregistrement...')
                            : (isArabic ? 'تسجيل المتابعة' : 'Ajouter le suivi')}
                        </button>
                      </div>
                      </fieldset>
                    </form>
                  )}

                  <section className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900">{isArabic ? 'سجل الاتصالات والمتابعات' : 'Historique des communications'} ({details.interactions.length})</h4>
                    {details.interactions.length === 0 ? (
                      <p className="rounded border border-dashed border-slate-300 px-3 py-5 text-center text-xs text-slate-500">
                        {isArabic ? 'لا توجد اتصالات مسجلة بعد.' : 'Aucune communication enregistrée.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {details.interactions.map((interaction) => (
                          <article key={interaction.id} className="rounded border border-slate-200 px-3 py-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <strong className="text-xs text-slate-800">{interaction.subject}</strong>
                              <span className="text-[10px] text-slate-500">{interactionLabel(interaction.type, language)} · {formatDate(interaction.occurredAtUtc, language)}</span>
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{interaction.summary}</p>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                              <span>{interaction.createdByFullName}</span>
                              {interaction.nextFollowUpAtUtc && (
                                <span>{isArabic ? 'المتابعة القادمة: ' : 'Prochain suivi : '}{formatDate(interaction.nextFollowUpAtUtc, language)}</span>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              ) : (
                <div className="flex h-full min-h-64 items-center justify-center px-4 text-center text-xs text-slate-500">
                  {noSelection}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );

  const discardConfirmDialog = (
    <ConfirmDialog
      open={pendingAction !== null}
      title={isArabic ? 'تغييرات غير محفوظة' : 'Modifications non enregistrées'}
      message={
        isArabic
          ? 'لديك بيانات أو متابعة غير محفوظة في نموذج الزبائن. هل تريد تجاهلها والمتابعة؟'
          : 'Vous avez des modifications ou un suivi non enregistré dans le registre clients. Voulez-vous les abandonner ?'
      }
      confirmLabel={isArabic ? 'تجاهل والمتابعة' : 'Abandonner et continuer'}
      cancelLabel={isArabic ? 'البقاء في النموذج' : 'Rester sur le formulaire'}
      onConfirm={() => {
        const next = pendingAction;
        setPendingAction(null);
        if (next && !busy) performAction(next);
      }}
      onCancel={() => setPendingAction(null)}
    />
  );

  if (mode === 'embedded') {
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
          {registryContent}
        </div>
        {discardConfirmDialog}
      </>
    );
  }

  return (
    <>
      <Modal
        open
        titleId="project-customers-title"
        onClose={requestClose}
        closeDisabled={busy}
        dir={isArabic ? 'rtl' : 'ltr'}
        overlayClassName="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5"
        panelClassName="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl outline-none"
      >
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-teal-800">
                <UserRound className="h-5 w-5 shrink-0" aria-hidden="true" />
                <h2 id="project-customers-title" className="text-base font-bold text-slate-900">{title}</h2>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                <span className="font-data">{project.code}</span> · {isArabic ? project.nameAr : project.nameFr}
              </p>
            </div>
            <button type="button" disabled={busy} onClick={requestClose} aria-label={isArabic ? 'إغلاق' : 'Fermer'} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          {registryContent}
      </Modal>
      {discardConfirmDialog}
    </>
  );
}