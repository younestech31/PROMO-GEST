import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, FileText, LoaderCircle, Upload, X } from 'lucide-react';
import type { AppLanguage, ProjectDocumentDto, ProjectDto } from '@/types/erp';
import { apiClient, ApiError } from '@/core/api/apiClient';
import { translateApiError } from '@/core/localization/translations';
import { Modal } from '@/shared/components/Modal';
import { ConfirmDialog } from '@/shared/components/StateViews';

interface ProjectDocumentsModalProps {
  project: ProjectDto;
  language: AppLanguage;
  canUpload: boolean;
  mode?: 'modal' | 'embedded';
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const CATEGORIES = [
  { code: 'Legal', ar: 'وثائق قانونية', fr: 'Documents juridiques' },
  { code: 'LandAndTitle', ar: 'عقود وملكية الأرض', fr: 'Foncier et propriété' },
  { code: 'Permits', ar: 'الرخص والتراخيص', fr: 'Permis et autorisations' },
  { code: 'Plans', ar: 'المخططات', fr: 'Plans' },
  { code: 'Engineering', ar: 'الدراسات التقنية والهندسية', fr: 'Études techniques' },
  { code: 'Commercial', ar: 'وثائق تجارية', fr: 'Documents commerciaux' },
  { code: 'Financial', ar: 'وثائق مالية', fr: 'Documents financiers' },
  { code: 'Correspondence', ar: 'المراسلات', fr: 'Correspondances' },
  { code: 'Other', ar: 'أخرى', fr: 'Autres' },
] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string, language: AppLanguage): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-DZ' : 'fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function categoryLabel(category: string, language: AppLanguage): string {
  const found = CATEGORIES.find((item) => item.code === category);
  return found ? (language === 'ar' ? found.ar : found.fr) : category;
}

export function ProjectDocumentsModal({
  project,
  language,
  canUpload,
  mode = 'modal',
  onClose,
  onDirtyChange,
}: ProjectDocumentsModalProps) {
  const isArabic = language === 'ar';
  const [subView, setSubView] = useState<'vault' | 'metadataPlanned' | 'linksPlanned' | 'retentionPlanned'>('vault');
  const [documents, setDocuments] = useState<ProjectDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('Other');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const listRequest = useRef(0);
  const viewLifetime = useRef<object | null>(null);
  const uploadRequest = useRef<object | null>(null);
  const downloadRequest = useRef<object | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<
    | { kind: 'close' }
    | { kind: 'subView'; target: 'vault' | 'metadataPlanned' | 'linksPlanned' | 'retentionPlanned' }
    | null
  >(null);

  const normalizedQuery = query.trim().normalize('NFKC').toLocaleLowerCase();
  const visibleDocuments = documents.filter((item) =>
    (!categoryFilter || item.category === categoryFilter) &&
    (!normalizedQuery || [item.originalFileName, item.description]
      .some((value) => value?.normalize('NFKC').toLocaleLowerCase().includes(normalizedQuery))));

  const isDirty = canUpload && (selectedFile !== null || description.trim() !== '' || category !== 'Other');

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const resetUploadDraft = () => {
    setSelectedFile(null);
    setDescription('');
    setCategory('Other');
    if (fileInput.current) fileInput.current.value = '';
  };

  const requestClose = () => {
    if (uploadRequest.current) return;
    if (isDirty) {
      setPendingAction({ kind: 'close' });
      return;
    }
    onClose?.();
  };

  const requestSwitchSubView = (target: 'vault' | 'metadataPlanned' | 'linksPlanned' | 'retentionPlanned') => {
    if (uploadRequest.current || target === subView) return;
    if (isDirty) {
      setPendingAction({ kind: 'subView', target });
      return;
    }
    setSubView(target);
  };

  const loadDocuments = useCallback(async () => {
    const request = ++listRequest.current;
    setDocuments([]);
    setLoading(true);
    setLoadError(null);
    try {
      const result = await apiClient.listProjectDocuments(project.id);
      if (request === listRequest.current) setDocuments(result);
    } catch (err) {
      if (request !== listRequest.current) return;
      setLoadError(err instanceof ApiError
        ? translateApiError(err.code, err.message, language)
        : (isArabic ? 'تعذر تحميل وثائق المشروع.' : 'Impossible de charger les documents du projet.'));
    } finally {
      if (request === listRequest.current) setLoading(false);
    }
  }, [project.id, isArabic]);

  useEffect(() => {
    viewLifetime.current = { projectId: project.id };
    uploadRequest.current = null;
    downloadRequest.current = null;
    setSubmitting(false);
    setDownloadingId(null);
    setSelectedFile(null);
    setDescription('');
    setCategory('Other');
    if (fileInput.current) fileInput.current.value = '';
    setQuery('');
    setCategoryFilter('');
    setSubView('vault');
    setPendingAction(null);
    setError(null);
    setUploadSuccess(null);
    return () => { viewLifetime.current = null; };
  }, [project.id]);

  useEffect(() => {
    void loadDocuments();
    return () => { ++listRequest.current; };
  }, [loadDocuments]);

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!canUpload || uploadRequest.current) return;
    setError(null);
    setUploadSuccess(null);

    if (!selectedFile) {
      setError(isArabic ? 'اختر ملفاً أولاً.' : 'Sélectionnez d’abord un fichier.');
      return;
    }
    if (selectedFile.size <= 0 || selectedFile.size > MAX_DOCUMENT_BYTES) {
      setError(isArabic
        ? 'حجم الملف يجب أن يكون أكبر من صفر ولا يتجاوز 25 ميغابايت.'
        : 'Le fichier doit être non vide et ne pas dépasser 25 Mo.');
      return;
    }

    const form = new FormData();
    form.append('file', selectedFile, selectedFile.name);
    form.append('category', category);
    form.append('description', description.trim());

    const lifetime = viewLifetime.current;
    const request = {};
    uploadRequest.current = request;
    setSubmitting(true);
    try {
      await apiClient.uploadProjectDocument(project.id, form);
      if (lifetime !== viewLifetime.current) return;
      setUploadSuccess(selectedFile.name);
      setSelectedFile(null);
      setDescription('');
      setCategory('Other');
      if (fileInput.current) fileInput.current.value = '';
      await loadDocuments();
    } catch (err) {
      if (lifetime !== viewLifetime.current) return;
      setError(err instanceof ApiError
        ? translateApiError(err.code, err.message, language)
        : (isArabic ? 'فشل رفع الوثيقة إلى الخادم المحلي.' : 'Échec du téléversement vers le serveur local.'));
    } finally {
      if (uploadRequest.current === request) uploadRequest.current = null;
      if (lifetime === viewLifetime.current) setSubmitting(false);
    }
  };

  const handleDownload = async (item: ProjectDocumentDto) => {
    if (downloadRequest.current || loading || loadError) return;
    const request = {};
    const lifetime = viewLifetime.current;
    downloadRequest.current = request;
    setError(null);
    setDownloadingId(item.id);
    try {
      const blob = await apiClient.downloadProjectDocument(project.id, item.id);
      if (lifetime !== viewLifetime.current) return;
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = item.originalFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      if (lifetime !== viewLifetime.current) return;
      setError(err instanceof ApiError
        ? translateApiError(err.code, err.message, language)
        : (isArabic ? 'تعذر تنزيل الوثيقة.' : 'Impossible de télécharger le document.'));
    } finally {
      if (downloadRequest.current === request) downloadRequest.current = null;
      if (lifetime === viewLifetime.current) setDownloadingId(null);
    }
  };

  const title = isArabic ? 'وثائق المشروع' : 'Documents du projet';
  const closeLabel = isArabic ? 'إغلاق' : 'Fermer';

  const documentsBody = (
    <>
      {mode === 'embedded' && (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 px-4 pt-3 bg-slate-50/70">
          {[
            { id: 'vault' as const, ar: 'وثائق المشروع (رفع/عرض/تنزيل)', fr: 'Documents projet (dépôt/lecture/téléchargement)' },
            { id: 'metadataPlanned' as const, ar: 'تحرير البيانات الوصفية والأرشفة المرنة (مخطط)', fr: 'Édition métadonnées & archivage souple (Planifié)' },
            { id: 'linksPlanned' as const, ar: 'الروابط المهيكلة DocumentLink (مخطط)', fr: 'Liens DocumentLink (Planifié)' },
            { id: 'retentionPlanned' as const, ar: 'سياسات الحفظ K-Full (مخطط)', fr: 'Rétention K-Full (Planifié)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={submitting} onClick={() => requestSwitchSubView(tab.id)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                subView === tab.id
                  ? 'border-teal-800 text-teal-900 bg-white rounded-t'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {isArabic ? tab.ar : tab.fr}
            </button>
          ))}
        </div>
      )}

      {mode === 'embedded' && subView !== 'vault' ? (
        <div className="p-5 text-xs text-slate-600">
          <div className="rounded-md border border-amber-200 bg-amber-50/70 p-4 text-amber-950 space-y-1.5">
            <div className="font-bold">
              {subView === 'metadataPlanned'
                ? (isArabic ? 'تحديث البيانات الوصفية والوسوم والأرشفة المرنة — مخطط' : 'Mise à jour des métadonnées, indexation & archivage souple — Planifié')
                : subView === 'linksPlanned'
                  ? (isArabic ? 'الربط المهيكل بالسجلات التجارية والهندسية (DocumentLink) — مخطط' : 'Liens structurés vers contrats, lots et chantiers (DocumentLink) — Planifié')
                  : (isArabic ? 'سياسات الاحتفاظ والأرشيف القانوني (K-Full) — مخطط' : 'Politiques de rétention et archivage probant (K-Full) — Planifié')}
            </div>
            <p className="leading-relaxed">
              {isArabic
                ? 'طبقة K-Min الحالية مفعّلة لرفع وثائق المشروع وعرضها وتنزيلها والتحقق التلقائي من بصمة SHA-256. تحرير البيانات الوصفية بعد الرفع والأرشفة المرنة (soft-archive) والروابط المهيكلة DocumentLink وسياسات الحفظ K-Full ما زالت مخططة للمرحلة القادمة.'
                : 'Le socle K-Min actif couvre le dépôt, la consultation, le téléchargement sécurisé et le contrôle SHA-256 des documents. L’édition des métadonnées après dépôt, l’archivage souple (soft-archive), les liens DocumentLink et les politiques K-Full restent planifiés.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {error && (
            <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </div>
          )}

          {uploadSuccess && <p role="status" className="rounded border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-950">
            {isArabic
              ? `تم رفع «${uploadSuccess}» إلى الخادم. لا تُعد رفعه إذا تعذر تحديث القائمة.`
              : `« ${uploadSuccess} » a été téléversé sur le serveur. Ne le renvoyez pas si le rechargement de la liste échoue.`}
          </p>}
          {loadError && <div role="alert" className="space-y-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            <p>{loadError}</p>
            <button type="button" disabled={loading || submitting} onClick={() => void loadDocuments()} className="rounded border border-red-300 px-3 py-2">
              {isArabic ? 'إعادة تحميل الوثائق' : 'Recharger les documents'}
            </button>
          </div>}

          {canUpload && (
            <form onSubmit={handleUpload} className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <fieldset disabled={submitting} className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">
                {isArabic ? 'رفع وثيقة جديدة إلى الخادم المحلي' : 'Ajouter un document au serveur local'}
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block space-y-1.5 text-xs font-medium text-slate-700">
                  <span>{isArabic ? 'الملف' : 'Fichier'}</span>
                  <input
                    id="project-document-file"
                    ref={fileInput}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded border border-slate-300 bg-white p-2 text-xs"
                  />
                  <span className="text-[11px] font-normal text-slate-500">
                    {isArabic ? 'PDF وصور ومستندات Office وTXT وCSV · الحد الأقصى 25 MB' : 'PDF, images, Office, TXT, CSV · 25 MB maximum'}
                  </span>
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-slate-700">
                  <span>{isArabic ? 'تصنيف الوثيقة' : 'Catégorie'}</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs"
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item.code} value={item.code}>{isArabic ? item.ar : item.fr}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block space-y-1.5 text-xs font-medium text-slate-700">
                <span>{isArabic ? 'وصف مختصر (اختياري)' : 'Description (facultative)'}</span>
                <input
                  type="text"
                  maxLength={500}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={isArabic ? 'مثال: رخصة البناء للعمارة أ' : 'Ex. : permis de construire du bâtiment A'}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-xs"
                />
              </label>
              {selectedFile && (
                <div className="text-xs text-slate-600">
                  {selectedFile.name} · {formatBytes(selectedFile.size)}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !selectedFile}
                  className="inline-flex items-center gap-2 rounded bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {submitting
                    ? (isArabic ? 'جارٍ الرفع...' : 'Téléversement...')
                    : (isArabic ? 'رفع الوثيقة' : 'Téléverser')}
                </button>
              </div>
              </fieldset>
            </form>
          )}

          {!canUpload && (
            <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {isArabic ? 'لديك صلاحية المطالعة فقط. لا تملك صلاحية رفع وثائق لهذا المشروع.' : 'Accès en lecture seule : vous ne pouvez pas ajouter de documents à ce projet.'}
            </p>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">
                {isArabic ? 'الوثائق المسجلة' : 'Documents enregistrés'} ({documents.length})
              </h3>
              <button
                type="button"
                onClick={() => void loadDocuments()}
                disabled={loading || submitting}
                className="text-xs font-medium text-teal-800 hover:underline disabled:opacity-50"
              >
                {isArabic ? 'تحديث القائمة' : 'Actualiser'}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <input type="search" aria-label={isArabic ? 'بحث في الوثائق المحملة' : 'Rechercher dans les documents chargés'}
                value={query} onChange={(event) => setQuery(event.target.value)}
                placeholder={isArabic ? 'اسم الملف أو الوصف...' : 'Nom du fichier ou description...'} className="rounded border border-slate-300 px-3 py-2 text-xs" />
              <select aria-label={isArabic ? 'تصفية تصنيف الوثائق' : 'Filtrer par catégorie de document'}
                value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded border border-slate-300 px-3 py-2 text-xs">
                <option value="">{isArabic ? 'كل التصنيفات' : 'Toutes les catégories'}</option>
                {CATEGORIES.map((item) => <option key={item.code} value={item.code}>{isArabic ? item.ar : item.fr}</option>)}
              </select>
              <p aria-live="polite" className="text-[11px] text-slate-500">{isArabic ? `عرض ${visibleDocuments.length} من ${documents.length}` : `${visibleDocuments.length} sur ${documents.length}`}</p>
              {(query || categoryFilter) && <button type="button" onClick={() => { setQuery(''); setCategoryFilter(''); }} className="text-xs font-semibold text-teal-800">{isArabic ? 'مسح التصفية' : 'Effacer les filtres'}</button>}
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {isArabic ? 'جارٍ تحميل الوثائق...' : 'Chargement des documents...'}
              </div>
            ) : loadError ? null : visibleDocuments.length === 0 ? (
              <div className="rounded border border-dashed border-slate-300 px-4 py-10 text-center text-xs text-slate-500">
                {query || categoryFilter
                  ? (isArabic ? 'لا توجد وثائق تطابق البحث والتصفية.' : 'Aucun document ne correspond aux filtres.')
                  : (isArabic ? 'لا توجد وثائق مسجلة لهذا المشروع بعد.' : 'Aucun document enregistré pour ce projet.')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded border border-slate-200">
                {visibleDocuments.map((item) => (
                  <article key={item.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded bg-teal-50 p-2 text-teal-800">
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="break-all text-xs font-semibold text-slate-900">{item.originalFileName}</div>
                        <div className="text-[11px] text-slate-600">
                          {categoryLabel(item.category, language)} · {formatBytes(item.sizeBytes)}
                        </div>
                        {item.description && <p className="text-[11px] text-slate-500">{item.description}</p>}
                        <div className="text-[11px] text-slate-400">
                          {item.uploadedByFullName} · {formatDate(item.createdAtUtc, language)}
                        </div>
                        <details className="text-[10px] text-slate-400">
                          <summary className="cursor-pointer">{isArabic ? 'بصمة SHA-256' : 'Empreinte SHA-256'}</summary>
                          <code className="mt-1 block break-all select-all">{item.sha256Checksum}</code>
                        </details>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDownload(item)}
                      disabled={downloadingId !== null || loading}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {downloadingId === item.id
                        ? <LoaderCircle className="h-4 w-4 animate-spin" />
                        : <Download className="h-4 w-4" />}
                      {isArabic ? 'تنزيل' : 'Télécharger'}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
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
          ? 'اخترت ملفاً أو أدخلت بيانات وثيقة لم تُرفع بعد. هل تريد تجاهلها والمتابعة؟'
          : 'Un fichier sélectionné ou une description n’a pas encore été téléversé. Voulez-vous l’abandonner ?'
      }
      confirmLabel={isArabic ? 'تجاهل والمتابعة' : 'Abandonner et continuer'}
      cancelLabel={isArabic ? 'البقاء في النموذج' : 'Rester sur le formulaire'}
      onConfirm={() => {
        if (uploadRequest.current) return;
        const next = pendingAction;
        setPendingAction(null);
        resetUploadDraft();
        if (next?.kind === 'close') {
          onClose?.();
        } else if (next?.kind === 'subView') {
          setSubView(next.target);
        }
      }}
      onCancel={() => setPendingAction(null)}
    />
  );

  if (mode === 'embedded') {
    return (
      <>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" dir={isArabic ? 'rtl' : 'ltr'}>
          {documentsBody}
        </div>
        {discardConfirmDialog}
      </>
    );
  }

  return (
    <>
      <Modal
        open
        titleId="project-documents-title"
        onClose={requestClose}
        closeDisabled={submitting || downloadingId !== null}
        dir={isArabic ? 'rtl' : 'ltr'}
        overlayClassName="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5"
        panelClassName="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl outline-none"
      >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-teal-800">
                <FileText className="h-5 w-5 shrink-0" aria-hidden="true" />
                <h2 id="project-documents-title" className="text-base font-bold text-slate-900">{title}</h2>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                <span className="font-data">{project.code}</span> · {isArabic ? project.nameAr : project.nameFr}
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              aria-label={closeLabel}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {documentsBody}

          <div className="flex justify-end border-t border-slate-200 px-5 py-3">
            <button
              type="button"
              onClick={requestClose}
              className="rounded border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isArabic ? 'إغلاق' : 'Fermer'}
            </button>
          </div>
      </Modal>
      {discardConfirmDialog}
    </>
  );
}
