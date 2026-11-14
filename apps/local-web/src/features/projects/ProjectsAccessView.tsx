import { useEffect, useState, type FormEvent } from 'react';
import { FolderPlus, KeyRound, Pencil, ShieldAlert, Trash2, Users, X } from 'lucide-react';
import type {
  AppLanguage,
  AssignProjectMemberRequest,
  AuthenticatedUser,
  CreateProjectRequest,
  ProjectDto,
  UpdateProjectRequest,
  UserDto,
} from '../../types/erp';
import { getTranslations, translateApiError } from '../../localization/translations';
import { ALGERIAN_WILAYAS, findWilaya, formatDzd } from '../../utils/algerianFormat';
import { canCreateProject, canManageProjectAccess, canManageProjects, canManageUsers } from '../../utils/permissions';
import { validateCreateProject, type ValidationErrors } from '../../utils/validation';
import { apiClient, ApiError } from '../../services/apiClient';
import { FormField, inputBaseClass } from '../../components/FormField';

interface ProjectsAccessViewProps {
  currentUser: AuthenticatedUser;
  language: AppLanguage;
  onProjectsChanged?: (projects: ProjectDto[]) => void;
}

const PROJECT_ROLES = [
  { code: 'ProjectManager', ar: 'مدير المشروع', fr: 'Chef de Projet' },
  { code: 'CommercialAgent', ar: 'مستشار تجاري', fr: 'Agent Commercial' },
  { code: 'FinanceController', ar: 'مراقب مالي', fr: 'Contrôleur Financier' },
  { code: 'SiteSupervisor', ar: 'مهندس متابعة الموقع', fr: 'Conducteur de Travaux' },
  { code: 'ReadOnlyObserver', ar: 'ملاحظ للمطالعة فقط', fr: 'Observateur Lecture Seule' },
];

const PROJECT_STATUSES = [
  { code: 'Planning', ar: 'قيد الدراسة والتصميم', fr: 'En étude / Planification' },
  { code: 'UnderConstruction', ar: 'قيد الإنجاز', fr: 'En cours de construction' },
  { code: 'Commercialization', ar: 'قيد التسويق والبيع', fr: 'En commercialisation' },
  { code: 'Delivered', ar: 'مسلّم', fr: 'Livré' },
  { code: 'Suspended', ar: 'معلّق', fr: 'Suspendu' },
];

export function ProjectsAccessView({
  currentUser,
  language,
  onProjectsChanged,
}: ProjectsAccessViewProps) {
  const t = getTranslations(language);

  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null);
  const [accessProject, setAccessProject] = useState<ProjectDto | null>(null);

  const [createForm, setCreateForm] = useState<CreateProjectRequest>({
    code: '',
    nameAr: '',
    nameFr: '',
    wilayaCode: '16',
    wilayaName: 'الجزائر / Alger',
    municipality: '',
    address: '',
    landTitleReference: '',
    buildingPermitNumber: '',
    buildingPermitDate: '',
    status: 'Planning',
    estimatedBudgetDzd: 0,
    plannedBlocksCount: 1,
    plannedUnitsCount: 0,
  });
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [memberForm, setMemberForm] = useState<AssignProjectMemberRequest>({
    userId: '',
    roleInProject: 'CommercialAgent',
    canViewFinancials: false,
    canManageSales: true,
    canManageConstruction: false,
    canManageDocuments: true,
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const projectList = await apiClient.listProjects();
      setProjects(projectList);
      onProjectsChanged?.(projectList);

      if (canManageUsers(currentUser)) {
        const userList = await apiClient.listUsers();
        setUsers(userList.filter((u) => !u.isSystemAdministrator && u.isActive));
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(translateApiError(err.code, err.message, language));
      } else {
        setError(language === 'ar' ? 'تعذر تحميل المشاريع.' : 'Impossible de charger les projets.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleWilayaChange = (code: string) => {
    const w = findWilaya(code);
    setCreateForm((p) => ({
      ...p,
      wilayaCode: code,
      wilayaName: w ? `${w.nameAr} / ${w.nameFr}` : code,
    }));
  };

  const handleProjectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const validation = validateCreateProject(createForm, language);
    setFormErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      if (editingProject) {
        const payload: UpdateProjectRequest = {
          nameAr: createForm.nameAr,
          nameFr: createForm.nameFr,
          wilayaCode: createForm.wilayaCode,
          wilayaName: createForm.wilayaName,
          municipality: createForm.municipality,
          address: createForm.address,
          landTitleReference: createForm.landTitleReference,
          buildingPermitNumber: createForm.buildingPermitNumber,
          buildingPermitDate: createForm.buildingPermitDate || null,
          status: createForm.status,
          estimatedBudgetDzd: createForm.estimatedBudgetDzd,
          plannedBlocksCount: createForm.plannedBlocksCount,
          plannedUnitsCount: createForm.plannedUnitsCount,
        };
        const updated = await apiClient.updateProject(editingProject.id, payload);
        const next = projects.map((project) => project.id === updated.id ? updated : project);
        setProjects(next);
        onProjectsChanged?.(next);
      } else {
        const created = await apiClient.createProject({
          ...createForm,
          buildingPermitDate: createForm.buildingPermitDate || null,
        });
        const next = [created, ...projects];
        setProjects(next);
        onProjectsChanged?.(next);
      }

      setCreateOpen(false);
      setEditingProject(null);
      setCreateForm({
        code: '',
        nameAr: '',
        nameFr: '',
        wilayaCode: '16',
        wilayaName: 'الجزائر / Alger',
        municipality: '',
        address: '',
        landTitleReference: '',
        buildingPermitNumber: '',
        buildingPermitDate: '',
        status: 'Planning',
        estimatedBudgetDzd: 0,
        plannedBlocksCount: 1,
        plannedUnitsCount: 0,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(translateApiError(err.code, err.message, language));
      } else {
        setModalError(
          editingProject
            ? (language === 'ar' ? 'فشل تحديث بيانات المشروع.' : 'Échec de la mise à jour du projet.')
            : (language === 'ar' ? 'فشل إنشاء المشروع.' : 'Échec de création du projet.')
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditProject = (project: ProjectDto) => {
    setEditingProject(project);
    setCreateForm({
      code: project.code,
      nameAr: project.nameAr,
      nameFr: project.nameFr,
      wilayaCode: project.wilayaCode,
      wilayaName: project.wilayaName,
      municipality: project.municipality,
      address: project.address ?? '',
      landTitleReference: project.landTitleReference ?? '',
      buildingPermitNumber: project.buildingPermitNumber ?? '',
      buildingPermitDate: project.buildingPermitDate ?? '',
      status: project.status,
      estimatedBudgetDzd: project.estimatedBudgetDzd,
      plannedBlocksCount: project.plannedBlocksCount,
      plannedUnitsCount: project.plannedUnitsCount,
    });
    setFormErrors({});
    setModalError(null);
    setCreateOpen(true);
  };

  const handleAssignMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessProject || !memberForm.userId) return;
    setModalError(null);
    setSubmitting(true);

    try {
      const updated = await apiClient.assignProjectMember(accessProject.id, memberForm);
      const next = projects.map((p) => (p.id === updated.id ? updated : p));
      setProjects(next);
      onProjectsChanged?.(next);
      setAccessProject(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(translateApiError(err.code, err.message, language));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (projectId: string, userId: string) => {
    setModalError(null);
    try {
      const updated = await apiClient.removeProjectMember(projectId, userId);
      const next = projects.map((p) => (p.id === updated.id ? updated : p));
      setProjects(next);
      onProjectsChanged?.(next);
      setAccessProject(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(translateApiError(err.code, err.message, language));
      }
    }
  };

  const statusLabel = (code: string) => {
    const found = PROJECT_STATUSES.find((s) => s.code === code);
    if (!found) return code;
    return language === 'ar' ? found.ar : found.fr;
  };

  const projectRoleLabel = (code: string) => {
    const found = PROJECT_ROLES.find((r) => r.code === code);
    if (!found) return code;
    return language === 'ar' ? found.ar : found.fr;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.projects.title}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.projects.subtitle}</p>
        </div>
        {canCreateProject(currentUser) && (
          <button
            type="button"
            onClick={() => {
              setEditingProject(null);
              setFormErrors({});
              setModalError(null);
              setCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
          >
            <FolderPlus className="w-4 h-4" aria-hidden="true" />
            <span>{t.projects.createButton}</span>
          </button>
        )}
      </div>

      <div className="rounded-md border border-slate-200 bg-white px-4 py-2.5 flex items-center gap-2.5 text-xs text-slate-600">
        <ShieldAlert className="w-4 h-4 text-teal-800 shrink-0" aria-hidden="true" />
        <span>{t.projects.projectGuardNotice}</span>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            <div className="h-10 bg-slate-100 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-sm font-bold text-slate-900">{t.projects.emptyTitle}</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{t.projects.emptyBody}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 text-start">{t.projects.tableCode}</th>
                  <th className="py-3 px-4 text-start">{t.projects.tableName}</th>
                  <th className="py-3 px-4 text-start">{t.projects.tableLocation}</th>
                  <th className="py-3 px-4 text-start">{t.projects.tableStatus}</th>
                  <th className="py-3 px-4 text-end">{t.projects.tableBudget}</th>
                  <th className="py-3 px-4 text-end">{t.projects.tableMembers}</th>
                  <th className="py-3 px-4 text-end">{t.users.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-data font-semibold text-slate-900">{p.code}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {language === 'ar' ? p.nameAr : p.nameFr}
                      </div>
                      <div className="text-xs text-slate-500">
                        <span className="font-data">{p.plannedBlocksCount}</span>{' '}
                        {language === 'ar' ? 'عمارات' : 'blocs'} ·{' '}
                        <span className="font-data">{p.plannedUnitsCount}</span>{' '}
                        {language === 'ar' ? 'وحدات' : 'unités'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      {p.wilayaCode} {p.wilayaName} — {p.municipality}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">{statusLabel(p.status)}</td>
                    <td className="py-3 px-4 text-end font-data text-slate-900">
                      {formatDzd(p.estimatedBudgetDzd, language)}
                    </td>
                    <td className="py-3 px-4 text-end font-data text-slate-700">
                      {p.members.length}
                    </td>
                    <td className="py-3 px-4 text-end">
                      <div className="inline-flex items-center justify-end gap-2">
                        {canManageProjects(currentUser) && (
                          <button
                            type="button"
                            onClick={() => openEditProject(p)}
                            className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                          >
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t.projects.editButton}</span>
                          </button>
                        )}
                        {canManageProjectAccess(currentUser, p) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAccessProject(p);
                            setModalError(null);
                            if (users.length > 0 && !memberForm.userId) {
                              setMemberForm((mf) => ({ ...mf, userId: users[0].id }));
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                        >
                          <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t.projects.manageAccess}</span>
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-project-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 id="create-project-title" className="text-base font-bold text-slate-900">
                {editingProject ? t.projects.modalEditTitle : t.projects.modalCreateTitle}
              </h2>
              <button
                type="button"
                aria-label={t.users.cancel}
                onClick={() => { setCreateOpen(false); setEditingProject(null); }}
                className="p-1.5 rounded text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {modalError}
              </div>
            )}

            <form onSubmit={handleProjectSubmit} noValidate className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField id="prj-code" label={t.projects.fieldCode} error={formErrors.code}>
                  <input
                    id="prj-code"
                    type="text"
                    dir="ltr"
                    placeholder="PRJ-16-001"
                    value={createForm.code}
                    disabled={Boolean(editingProject)}
                    onChange={(e) => setCreateForm((p) => ({ ...p, code: e.target.value }))}
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="prj-status" label={t.projects.fieldStatus}>
                  <select
                    id="prj-status"
                    value={createForm.status}
                    onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value }))}
                    className={inputBaseClass}
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {language === 'ar' ? s.ar : s.fr}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField id="prj-nameAr" label={t.projects.fieldNameAr} error={formErrors.nameAr}>
                  <input
                    id="prj-nameAr"
                    type="text"
                    value={createForm.nameAr}
                    onChange={(e) => setCreateForm((p) => ({ ...p, nameAr: e.target.value }))}
                    className={inputBaseClass}
                  />
                </FormField>

                <FormField id="prj-nameFr" label={t.projects.fieldNameFr}>
                  <input
                    id="prj-nameFr"
                    type="text"
                    dir="ltr"
                    value={createForm.nameFr}
                    onChange={(e) => setCreateForm((p) => ({ ...p, nameFr: e.target.value }))}
                    className={inputBaseClass}
                  />
                </FormField>

                <FormField id="prj-wilaya" label={t.projects.fieldWilaya}>
                  <select
                    id="prj-wilaya"
                    value={createForm.wilayaCode}
                    onChange={(e) => handleWilayaChange(e.target.value)}
                    className={inputBaseClass}
                  >
                    {ALGERIAN_WILAYAS.map((w) => (
                      <option key={w.code} value={w.code}>
                        {w.code} — {language === 'ar' ? w.nameAr : w.nameFr}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  id="prj-municipality"
                  label={t.projects.fieldMunicipality}
                  error={formErrors.municipality}
                >
                  <input
                    id="prj-municipality"
                    type="text"
                    value={createForm.municipality}
                    onChange={(e) => setCreateForm((p) => ({ ...p, municipality: e.target.value }))}
                    className={inputBaseClass}
                  />
                </FormField>

                <FormField
                  id="prj-budget"
                  label={t.projects.fieldBudgetDzd}
                  error={formErrors.estimatedBudgetDzd}
                >
                  <input
                    id="prj-budget"
                    type="number"
                    min="0"
                    step="0.01"
                    dir="ltr"
                    value={createForm.estimatedBudgetDzd}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, estimatedBudgetDzd: Number(e.target.value) }))
                    }
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="prj-blocks" label={t.projects.fieldBlocks}>
                  <input
                    id="prj-blocks"
                    type="number"
                    min="0"
                    dir="ltr"
                    value={createForm.plannedBlocksCount}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, plannedBlocksCount: Number(e.target.value) }))
                    }
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="prj-units" label={t.projects.fieldUnits}>
                  <input
                    id="prj-units"
                    type="number"
                    min="0"
                    dir="ltr"
                    value={createForm.plannedUnitsCount}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, plannedUnitsCount: Number(e.target.value) }))
                    }
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="prj-land" label={t.projects.fieldLandTitle}>
                  <input
                    id="prj-land"
                    type="text"
                    dir="ltr"
                    value={createForm.landTitleReference ?? ''}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, landTitleReference: e.target.value }))
                    }
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setCreateOpen(false); setEditingProject(null); }}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  {t.users.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-teal-800 text-white hover:bg-teal-900 disabled:opacity-60"
                >
                  {t.users.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Project Access Modal */}
      {accessProject && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-access-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 id="project-access-title" className="text-base font-bold text-slate-900">
                  {t.projects.modalAccessTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-data">{accessProject.code}</span> ·{' '}
                  {language === 'ar' ? accessProject.nameAr : accessProject.nameFr}
                </p>
              </div>
              <button
                type="button"
                aria-label={t.users.cancel}
                onClick={() => setAccessProject(null)}
                className="p-1.5 rounded text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div role="alert" className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                {modalError}
              </div>
            )}

            {/* Existing members */}
            <div className="mt-4">
              {accessProject.members.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 border border-dashed border-slate-200 rounded text-center">
                  {t.projects.noMembersYet}
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                  {accessProject.members.map((m) => (
                    <div
                      key={m.id}
                      className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {m.fullName} <span className="font-data text-xs text-slate-500">({m.username})</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">
                          {projectRoleLabel(m.roleInProject)}
                          {' · '}
                          {[
                            m.canViewFinancials ? t.projects.permFinancials : null,
                            m.canManageSales ? t.projects.permSales : null,
                            m.canManageConstruction ? t.projects.permConstruction : null,
                            m.canManageDocuments ? t.projects.permDocuments : null,
                          ]
                            .filter(Boolean)
                            .join(' / ')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(accessProject.id, m.userId)}
                        className="inline-flex items-center gap-1 rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 self-start sm:self-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.projects.removeMember}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assign new member */}
            <form onSubmit={handleAssignMember} className="mt-6 pt-5 border-t border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">{t.projects.assignMemberTitle}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField id="pm-user" label={t.projects.selectEmployee}>
                  <select
                    id="pm-user"
                    value={memberForm.userId}
                    onChange={(e) => setMemberForm((p) => ({ ...p, userId: e.target.value }))}
                    className={inputBaseClass}
                  >
                    <option value="">—</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.username})
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField id="pm-role" label={t.projects.projectRole}>
                  <select
                    id="pm-role"
                    value={memberForm.roleInProject}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, roleInProject: e.target.value }))
                    }
                    className={inputBaseClass}
                  >
                    {PROJECT_ROLES.map((r) => (
                      <option key={r.code} value={r.code}>
                        {language === 'ar' ? r.ar : r.fr}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={memberForm.canViewFinancials}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, canViewFinancials: e.target.checked }))
                    }
                    className="accent-teal-800"
                  />
                  <span>{t.projects.permFinancials}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={memberForm.canManageSales}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, canManageSales: e.target.checked }))
                    }
                    className="accent-teal-800"
                  />
                  <span>{t.projects.permSales}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={memberForm.canManageConstruction}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, canManageConstruction: e.target.checked }))
                    }
                    className="accent-teal-800"
                  />
                  <span>{t.projects.permConstruction}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={memberForm.canManageDocuments}
                    onChange={(e) =>
                      setMemberForm((p) => ({ ...p, canManageDocuments: e.target.checked }))
                    }
                    className="accent-teal-800"
                  />
                  <span>{t.projects.permDocuments}</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAccessProject(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  {t.users.cancel}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !memberForm.userId}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-teal-800 text-white hover:bg-teal-900 disabled:opacity-60"
                >
                  {t.projects.assignButton}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
