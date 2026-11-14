import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Download, FileText, LoaderCircle, Upload, X } from 'lucide-react';
import type { AppLanguage, ProjectDocumentDto, ProjectDto } from '../../types/erp';
import { apiClient, ApiError } from '../../services/apiClient';

interface ProjectDocumentsModalProps {
  project: ProjectDto;
  language: AppLanguage;
  canUpload: boolean;
  onClose: () => void;
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
  onClose,
}: ProjectDocumentsModalProps) {
  const isArabic = language === 'ar';
  const [documents, setDocuments] = useState<ProjectDocumentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('Other');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.listProjectDocuments(project.id);
      setDocuments(result);
    } catch (err) {
      setError(err instanceof ApiError
        ? err.message
        : (isArabic ? 'تعذر تحميل وثائق المشروع.' : 'Impossible de charger les documents du projet.'));
    } finally {
      setLoading(false);
    }
  }, [project.id, isArabic]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

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

    setSubmitting(true);
    try {
      await apiClient.uploadProjectDocument(project.id, form);
      setSelectedFile(null);
      setDescription('');
      setCategory('Other');
      const input = document.getElementById('project-document-file') as HTMLInputElement | null;
      if (input) input.value = '';
      await loadDocuments();
    } catch (err) {
      setError(err instanceof ApiError
        ? err.message
        : (isArabic ? 'فشل رفع الوثيقة إلى الخادم المحلي.' : 'Échec du téléversement vers le serveur local.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (item: ProjectDocumentDto) => {
    setError(null);
    setDownloadingId(item.id);
    try {
      const blob = await apiClient.downloadProjectDocument(project.id, item.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = item.originalFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      setError(err instanceof ApiError
        ? err.message
        : (isArabic ? 'تعذر تنزيل الوثيقة.' : 'Impossible de télécharger le document.'));
    } finally {
      setDownloadingId(null);
    }
  };

  const title = isArabic ? 'وثائق المشروع' : 'Documents du projet';
  const closeLabel = isArabic ? 'إغلاق' : 'Fermer';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-documents-title"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
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
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {error && (
            <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </div>
          )}

          {canUpload && (
            <form onSubmit={handleUpload} className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-bold text-slate-900">
                {isArabic ? 'رفع وثيقة جديدة إلى الخادم المحلي' : 'Ajouter un document au serveur local'}
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block space-y-1.5 text-xs font-medium text-slate-700">
                  <span>{isArabic ? 'الملف' : 'Fichier'}</span>
                  <input
                    id="project-document-file"
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
                disabled={loading}
                className="text-xs font-medium text-teal-800 hover:underline disabled:opacity-50"
              >
                {isArabic ? 'تحديث القائمة' : 'Actualiser'}
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {isArabic ? 'جارٍ تحميل الوثائق...' : 'Chargement des documents...'}
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded border border-dashed border-slate-300 px-4 py-10 text-center text-xs text-slate-500">
                {isArabic ? 'لا توجد وثائق مسجلة لهذا المشروع بعد.' : 'Aucun document enregistré pour ce projet.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded border border-slate-200">
                {documents.map((item) => (
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
                      disabled={downloadingId === item.id}
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

        <div className="flex justify-end border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {isArabic ? 'إغلاق' : 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
}
