import { useEffect, useState, type FormEvent } from 'react';
import { Info, LoaderCircle, Pencil, Search, ShieldCheck, Users2, X } from 'lucide-react';
import type { AppLanguage, AuthenticatedUser, PartyDirectoryItemDto } from '@/types/erp';
import { apiClient, ApiError } from '@/core/api/apiClient';
import { translateApiError } from '@/core/localization/translations';
import { canManagePartyIdentity, canReadPartyDirectory } from '@/core/permissions/permissionPolicy';
import { PageHeader } from '@/components/PageHeader';
import { ConfirmDialog, EmptyState, ErrorBanner } from '@/components/StateViews';
import { FormField, inputBaseClass } from '@/components/FormField';

interface PartiesDirectoryViewProps {
  currentUser: AuthenticatedUser;
  language: AppLanguage;
  onNavigateHome: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function PartiesDirectoryView({
  currentUser,
  language,
  onNavigateHome,
  onDirtyChange,
}: PartiesDirectoryViewProps) {
  const isArabic = language === 'ar';
  const canRead = canReadPartyDirectory(currentUser);
  const canEdit = canManagePartyIdentity(currentUser);

  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PartyDirectoryItemDto[]>([]);

  const [editingParty, setEditingParty] = useState<PartyDirectoryItemDto | null>(null);
  const [editKind, setEditKind] = useState<'Person' | 'LegalEntity'>('Person');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const isEditorDirty = Boolean(
    editingParty &&
      (editKind !== (editingParty.kind === 'LegalEntity' ? 'LegalEntity' : 'Person') ||
        editDisplayName !== editingParty.displayName)
  );

  useEffect(() => {
    onDirtyChange?.(isEditorDirty);
  }, [isEditorDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  const requestCloseEditor = () => {
    if (isEditorDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    setEditingParty(null);
  };

  const handleSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError(
        isArabic
          ? 'أدخل حرفين على الأقل للبحث في دليل الأطراف المركزي.'
          : 'Saisissez au moins 2 caractères pour rechercher dans le répertoire des tiers.'
      );
      return;
    }

    setError(null);
    setSaveSuccess(null);
    setLoading(true);
    try {
      const items = await apiClient.searchPartyDirectory(trimmed);
      setResults(items);
      setHasSearched(true);
    } catch (err) {
      setResults([]);
      setError(
        err instanceof ApiError
          ? translateApiError(err.code, err.message, language)
          : (isArabic ? 'تعذر البحث في دليل الأطراف.' : 'Impossible d’interroger le répertoire des tiers.')
      );
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (party: PartyDirectoryItemDto) => {
    setEditingParty(party);
    setEditKind(party.kind === 'LegalEntity' ? 'LegalEntity' : 'Person');
    setEditDisplayName(party.displayName);
    setSaveError(null);
  };

  const handleSaveIdentity = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingParty) return;
    setSaveError(null);
    setSaving(true);
    try {
      const updated = await apiClient.updatePartyIdentity(editingParty.id, {
        kind: editKind,
        displayName: editDisplayName.trim(),
        concurrencyStamp: editingParty.concurrencyStamp,
      });
      setResults((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingParty(null);
      setSaveSuccess(
        isArabic
          ? 'تم تحديث الهوية المركزية للطرف بنجاح.'
          : 'L’identité centrale du tiers a été mise à jour.'
      );
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? translateApiError(err.code, err.message, language)
          : (isArabic ? 'فشل تحديث هوية الطرف.' : 'Échec de la mise à jour de l’identité du tiers.')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isArabic ? 'دليل الأطراف المركزي (Tiers)' : 'Répertoire central des tiers'}
        subtitle={
          isArabic
            ? 'الهوية المرجعية المشتركة على مستوى المؤسسة للأشخاص الطبيعيين والمعنويين عبر المشاريع.'
            : 'Identité canonique partagée à l’échelle de l’organisation pour les personnes physiques et morales.'
        }
        language={language}
        moduleCode="D"
        moduleState="PARTIALLY_IMPLEMENTED"
        breadcrumbs={[
          { label: isArabic ? 'مساحة المؤسسة' : 'Organisation', onClick: onNavigateHome },
          { label: isArabic ? 'دليل الأطراف' : 'Tiers' },
        ]}
      />

      {/* D-012 architectural scope clarification */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Info className="h-4 w-4 text-teal-800 shrink-0" aria-hidden="true" />
          <span>
            {isArabic
              ? 'نطاق الهوية المركزية الحالي وما هو مخطط (D-012)'
              : 'Périmètre actuel de l’identité centrale et extensions planifiées (D-012)'}
          </span>
        </div>
        <p className="leading-relaxed">
          {isArabic
            ? 'يدعم الخادم حالياً البحث عن الأطراف وتحديث الهوية المركزية فقط (النوع والاسم الكامل). نقاط الاتصال المتعددة (PartyContactPoint)، المعرّفات الوطنية/الجبائية (PartyIdentifier)، الممثلون القانونيون (PartyRepresentative)، ودمج التكرارات ستُضاف في المرحلة القادمة.'
            : 'Le serveur actif prend en charge la recherche et la mise à jour de l’identité canonique (type et dénomination). Les points de contact multiples (PartyContactPoint), identifiants fiscaux/CIN (PartyIdentifier), représentants légaux et fusion manuelle des doublons sont planifiés.'}
        </p>
      </div>

      {!canRead ? (
        <ErrorBanner
          message={
            isArabic
              ? 'ليس لديك صلاحية الاطلاع على دليل الأطراف المركزي (parties.directory.read).'
              : 'Vous ne disposez pas du droit de consultation du répertoire des tiers (parties.directory.read).'
          }
        />
      ) : (
        <>
          {error && <ErrorBanner message={error} />}
          {saveSuccess && (
            <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
              {saveSuccess}
            </div>
          )}

          <form
            onSubmit={handleSearch}
            className="rounded-lg border border-slate-200 bg-white p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
          >
            <div className="flex-1">
              <FormField
                id="party-directory-search"
                label={isArabic ? 'البحث بالاسم القانوني أو الاسم الكامل' : 'Rechercher par nom complet ou raison sociale'}
              >
                <div className="relative">
                  <Search
                    className={`h-4 w-4 text-slate-400 absolute top-2.5 ${isArabic ? 'right-3' : 'left-3'}`}
                    aria-hidden="true"
                  />
                  <input
                    id="party-directory-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isArabic ? 'مثال: أمينة أو شركة...' : 'Ex. : Amina ou SARL...'}
                    className={`${inputBaseClass} ${isArabic ? 'pr-9' : 'pl-9'}`}
                  />
                </div>
              </FormField>
            </div>
            <button
              type="submit"
              disabled={loading || query.trim().length < 2}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
            >
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>{isArabic ? 'بحث في الدليل' : 'Rechercher'}</span>
            </button>
          </form>

          {!hasSearched ? (
            <EmptyState
              icon={<Users2 className="h-8 w-8" aria-hidden="true" />}
              title={isArabic ? 'ابحث في دليل الأطراف المركزي' : 'Interroger le répertoire central des tiers'}
              description={
                isArabic
                  ? 'يعمل الدليل عبر البحث النصي على الخادم المحلي (حرفان على الأقل) لحماية قائمة الأطراف عند تضخم البيانات.'
                  : 'La recherche s’effectue côté serveur (2 caractères minimum) afin d’éviter le chargement complet non borné.'
              }
            />
          ) : results.length === 0 ? (
            <EmptyState
              icon={<Users2 className="h-8 w-8" aria-hidden="true" />}
              title={isArabic ? 'لم يتم العثور على أطراف مطابقة' : 'Aucun tiers trouvé'}
              description={
                isArabic
                  ? 'جرّب جزءاً آخر من الاسم أو أنشئ السجل من داخل سجل زبائن المشروع لربطه بالهوية تلقائياً.'
                  : 'Essayez un autre terme ou créez le dossier depuis un projet pour enregistrer une identité.'
              }
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-start border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4 text-start">{isArabic ? 'المعرّف' : 'Identifiant'}</th>
                      <th className="py-3 px-4 text-start">{isArabic ? 'الاسم القانوني / الكامل' : 'Dénomination / Nom'}</th>
                      <th className="py-3 px-4 text-start">{isArabic ? 'الطبيعة القانونية' : 'Nature'}</th>
                      <th className="py-3 px-4 text-end">{isArabic ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((party) => (
                      <tr key={party.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-data text-xs text-slate-500" dir="ltr">
                          {party.id}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{party.displayName}</td>
                        <td className="py-3 px-4 text-xs text-slate-700">
                          {party.kind === 'Person'
                            ? (isArabic ? 'شخص طبيعي' : 'Personne physique')
                            : (isArabic ? 'شخص معنوي / مؤسسة' : 'Personne morale')}
                        </td>
                        <td className="py-3 px-4 text-end">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => openEditor(party)}
                              className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{isArabic ? 'تحديث الهوية' : 'Modifier l’identité'}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{isArabic ? 'مطالعة فقط' : 'Lecture seule'}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Canonical Identity Modal */}
      {editingParty && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-party-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 id="edit-party-title" className="text-base font-bold text-slate-900">
                {isArabic ? 'تعديل الهوية المركزية للطرف' : 'Modifier l’identité centrale du tiers'}
              </h2>
              <button
                type="button"
                aria-label={isArabic ? 'إغلاق' : 'Fermer'}
                onClick={requestCloseEditor}
                className="p-1.5 rounded text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveError && (
              <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {saveError}
              </div>
            )}

            <form onSubmit={handleSaveIdentity} className="mt-4 space-y-4">
              <FormField id="party-edit-kind" label={isArabic ? 'الطبيعة القانونية' : 'Nature du tiers'}>
                <select
                  id="party-edit-kind"
                  value={editKind}
                  onChange={(e) => setEditKind(e.target.value as 'Person' | 'LegalEntity')}
                  className={inputBaseClass}
                >
                  <option value="Person">{isArabic ? 'شخص طبيعي' : 'Personne physique'}</option>
                  <option value="LegalEntity">{isArabic ? 'شخص معنوي / مؤسسة' : 'Personne morale'}</option>
                </select>
              </FormField>

              <FormField id="party-edit-name" label={isArabic ? 'الاسم القانوني أو الكامل *' : 'Nom complet ou raison sociale *'}>
                <input
                  id="party-edit-name"
                  required
                  maxLength={200}
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className={inputBaseClass}
                />
              </FormField>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={requestCloseEditor}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  {isArabic ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={saving || !editDisplayName.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-teal-800 text-white hover:bg-teal-900 disabled:opacity-60"
                >
                  {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Enregistrement...') : (isArabic ? 'حفظ' : 'Enregistrer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDiscardOpen}
        title={isArabic ? 'تغييرات غير محفوظة' : 'Modifications non enregistrées'}
        message={
          isArabic
            ? 'لديك تعديلات غير محفوظة على هوية الطرف. هل تريد تجاهلها وإغلاق النافذة؟'
            : 'Vous avez des modifications non enregistrées sur l’identité du tiers. Voulez-vous les abandonner ?'
        }
        confirmLabel={isArabic ? 'تجاهل وإغلاق' : 'Abandonner et fermer'}
        cancelLabel={isArabic ? 'البقاء في النموذج' : 'Continuer l’édition'}
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          setEditingParty(null);
        }}
        onCancel={() => setConfirmDiscardOpen(false)}
      />
    </div>
  );
}
