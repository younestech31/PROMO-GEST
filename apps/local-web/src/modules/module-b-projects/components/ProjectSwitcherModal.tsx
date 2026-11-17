import { useEffect, useMemo, useRef, useState } from 'react';
import { FolderKanban, LoaderCircle, Pin, Search, X } from 'lucide-react';
import type { AppLanguage, ProjectDto } from '@/types/erp';
import { apiClient, ApiError } from '@/core/api/apiClient';
import { translateApiError } from '@/core/localization/translations';
import { filterAuthorizedPreferenceIds, type ProjectNavigationPreferences } from '@/shared/utils/navigationPreferences';
import { formatProjectStatus } from '@/shared/components/ProjectIdentityStrip';

interface ProjectSwitcherModalProps {
  open: boolean;
  language: AppLanguage;
  currentProjectId: string | null;
  authorizedProjects: ProjectDto[];
  preferences: ProjectNavigationPreferences;
  onSelectProject: (project: ProjectDto) => void;
  onBrowseDirectory: () => void;
  onClose: () => void;
}

export function ProjectSwitcherModal({
  open,
  language,
  currentProjectId,
  authorizedProjects,
  preferences,
  onSelectProject,
  onBrowseDirectory,
  onClose,
}: ProjectSwitcherModalProps) {
  const isArabic = language === 'ar';
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [serverProjects, setServerProjects] = useState<ProjectDto[]>(authorizedProjects);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setServerProjects(authorizedProjects);
    setError(null);
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(id);
  }, [open, authorizedProjects]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await apiClient.listProjects(query.trim() ? { q: query.trim() } : undefined);
        if (!cancelled) {
          setServerProjects(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? translateApiError(err.code, err.message, language)
              : (isArabic ? 'تعذر تحديث قائمة المشاريع من الخادم.' : 'Impossible d’actualiser la liste des projets.')
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, language, isArabic]);

  const currentProject = useMemo(
    () => serverProjects.find((p) => p.id === currentProjectId) ?? authorizedProjects.find((p) => p.id === currentProjectId) ?? null,
    [serverProjects, authorizedProjects, currentProjectId]
  );

  const pinnedProjects = useMemo(
    () => filterAuthorizedPreferenceIds(preferences.pinnedProjectIds, serverProjects),
    [preferences.pinnedProjectIds, serverProjects]
  );

  const recentProjects = useMemo(() => {
    const pinnedSet = new Set(pinnedProjects.map((p) => p.id));
    return filterAuthorizedPreferenceIds(preferences.recentProjectIds, serverProjects).filter(
      (p) => !pinnedSet.has(p.id) && p.id !== currentProjectId
    );
  }, [preferences.recentProjectIds, pinnedProjects, serverProjects, currentProjectId]);

  if (!open) return null;

  const renderProjectRow = (project: ProjectDto, badge?: string) => {
    const active = project.id === currentProjectId;
    const primaryName = isArabic ? project.nameAr : project.nameFr;
    return (
      <button
        key={`${badge ?? 'all'}-${project.id}`}
        type="button"
        onClick={() => onSelectProject(project)}
        className={`w-full rounded-md border px-3 py-2.5 text-start transition-colors flex items-center justify-between gap-3 ${
          active
            ? 'border-teal-700 bg-teal-50/70'
            : 'border-slate-200 bg-white hover:border-teal-600 hover:bg-slate-50'
        }`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span dir="ltr" className="font-data text-xs font-bold text-teal-900">
              {project.code}
            </span>
            <span className="text-sm font-semibold text-slate-900 truncate">{primaryName}</span>
            {active && (
              <span className="rounded border border-teal-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
                {isArabic ? 'نشط' : 'Actif'}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 truncate">
            <span className="font-data">{project.wilayaCode}</span> {project.wilayaName} — {project.municipality}
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-slate-600">
          {formatProjectStatus(project.status, language)}
        </span>
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[85] flex items-start justify-center bg-slate-950/50 p-4 pt-12 sm:pt-16"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-switcher-title"
    >
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[82vh]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 id="project-switcher-title" className="text-sm font-bold text-slate-900">
              {isArabic ? 'مبدّل المشروع الصريح' : 'Sélecteur explicite de projet'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isArabic
                ? 'تعرض هذه القائمة المشاريع المصرح لك بها من الخادم فقط.'
                : 'Seuls les projets autorisés par le serveur sont affichés ici.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isArabic ? 'إغلاق' : 'Fermer'}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-4 py-3 bg-slate-50/70">
          <div className="relative">
            <Search
              className={`h-4 w-4 text-slate-400 absolute top-2.5 ${isArabic ? 'right-3' : 'left-3'}`}
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isArabic ? 'ابحث برمز المشروع، الاسم، الولاية أو البلدية...' : 'Rechercher par code, nom, wilaya ou commune...'}
              className={`w-full rounded-md border border-slate-300 bg-white py-2 text-xs text-slate-900 outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 ${
                isArabic ? 'pr-9 pl-3' : 'pl-9 pr-3'
              }`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{isArabic ? 'جارٍ البحث في الخادم...' : 'Recherche côté serveur...'}</span>
            </div>
          ) : serverProjects.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
              {isArabic ? 'لا توجد مشاريع مطابقة ضمن نطاق صلاحياتك.' : 'Aucun projet autorisé ne correspond à votre recherche.'}
            </div>
          ) : (
            <>
              {!query.trim() && currentProject && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500">
                    {isArabic ? 'المشروع المفتوح حالياً' : 'Projet actuellement ouvert'}
                  </div>
                  {renderProjectRow(currentProject, 'current')}
                </div>
              )}

              {!query.trim() && pinnedProjects.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                    <Pin className="h-3 w-3" aria-hidden="true" />
                    <span>{isArabic ? 'المشاريع المثبتة' : 'Projets épinglés'}</span>
                  </div>
                  <div className="space-y-1.5">{pinnedProjects.map((p) => renderProjectRow(p, 'pinned'))}</div>
                </div>
              )}

              {!query.trim() && recentProjects.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500">
                    {isArabic ? 'المشاريع المفتوحة مؤخراً' : 'Récemment ouverts'}
                  </div>
                  <div className="space-y-1.5">{recentProjects.map((p) => renderProjectRow(p, 'recent'))}</div>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-500">
                  {query.trim()
                    ? (isArabic ? `نتائج البحث (${serverProjects.length})` : `Résultats (${serverProjects.length})`)
                    : (isArabic ? `جميع المشاريع المصرح بها (${serverProjects.length})` : `Tous les projets autorisés (${serverProjects.length})`)}
                </div>
                <div className="space-y-1.5">{serverProjects.map((p) => renderProjectRow(p, 'all'))}</div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[11px] text-slate-500 font-data">Ctrl+K / Cmd+K</span>
          <button
            type="button"
            onClick={onBrowseDirectory}
            className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
          >
            <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isArabic ? 'تصفح دليل المشاريع' : 'Parcourir l’annuaire'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
