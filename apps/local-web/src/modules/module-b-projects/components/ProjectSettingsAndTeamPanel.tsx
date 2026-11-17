import { useState, type FormEvent } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import type { AppLanguage, ProjectDto, UserDto } from "@/types/erp";
import { getTranslations, translateApiError } from "@/core/localization/translations";
import { ApiError } from "@/core/api/apiClient";
import { FormField, inputBaseClass } from "@/shared/components/FormField";
import { projectsApi } from '../api/projectsApi';

interface ProjectSettingsAndTeamPanelProps {
  project: ProjectDto;
  language: AppLanguage;
  allUsers: UserDto[];
  canManageAccess: boolean;
  canManageProject: boolean;
  onProjectUpdated: (project: ProjectDto) => void;
}

export function ProjectSettingsAndTeamPanel({
  project,
  language,
  allUsers,
  canManageAccess,
  canManageProject: _canManageProject,
  onProjectUpdated,
}: ProjectSettingsAndTeamPanelProps) {
  const isArabic = language === 'ar';
  const t = getTranslations(language);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [projectRole, setProjectRole] = useState<'ProjectManager' | 'SiteEngineer' | 'SalesAgent' | 'Accountant'>('SalesAgent');
  const [canViewFinancials, setCanViewFinancials] = useState(false);
  const [canManageSales, setCanManageSales] = useState(true);
  const [canManageConstruction, setCanManageConstruction] = useState(false);
  const [canManageDocuments, setCanManageDocuments] = useState(true);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const assignedUserIds = new Set(project.members.map((m) => m.userId));
  const availableUsers = allUsers.filter((u) => u.isActive && !assignedUserIds.has(u.id));

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setAssignError(null);
    setSubmitting(true);

    try {
      const updated = await projectsApi.assignProjectMember(project.id, {
        userId: selectedUserId,
        roleInProject: projectRole,
        canViewFinancials,
        canManageSales,
        canManageConstruction,
        canManageDocuments,
      });
      onProjectUpdated(updated);
      setSelectedUserId('');
    } catch (err) {
      if (err instanceof ApiError) {
        setAssignError(translateApiError(err.code, err.message, language));
      } else {
        setAssignError(isArabic ? 'تعذر تعيين الموظف للمشروع.' : 'Échec de l’attribution de l’employé.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setAssignError(null);
    try {
      const updated = await projectsApi.removeProjectMember(project.id, userId);
      onProjectUpdated(updated);
    } catch (err) {
      if (err instanceof ApiError) {
        setAssignError(translateApiError(err.code, err.message, language));
      }
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-950">
              {isArabic ? 'فريق العمل وصلاحيات الوصول المصرح بها' : 'Équipe et habilitations projet'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isArabic
                ? 'لا يمكن لأي موظف الاطلاع على المشروع أو وحداته أو مبيعاته دون تعيين صريح هنا.'
                : 'Aucun employé ne peut accéder au projet sans habilitation explicite accordée ici.'}
            </p>
          </div>
          <span className="rounded border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold font-data text-teal-900">
            {project.members.length} {isArabic ? 'أعضاء' : 'membres'}
          </span>
        </div>

        {assignError && (
          <div role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
            {assignError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <th className="py-2.5 px-3 text-start">{isArabic ? 'الموظف' : 'Employé'}</th>
                <th className="py-2.5 px-3 text-start">{isArabic ? 'الدور في المشروع' : 'Rôle projet'}</th>
                <th className="py-2.5 px-3 text-center">{isArabic ? 'مالية' : 'Finances'}</th>
                <th className="py-2.5 px-3 text-center">{isArabic ? 'مبيعات' : 'Ventes'}</th>
                <th className="py-2.5 px-3 text-center">{isArabic ? 'أشغال' : 'Chantier'}</th>
                <th className="py-2.5 px-3 text-center">{isArabic ? 'وثائق' : 'Documents'}</th>
                <th className="py-2.5 px-3 text-end">{isArabic ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {project.members.map((m) => (
                <tr key={m.userId} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{m.fullName}</div>
                    <div className="text-[11px] text-slate-500 font-data">{m.username}</div>
                  </td>
                  <td className="py-3 px-3 font-medium text-teal-900">{m.roleInProject}</td>
                  <td className="py-3 px-3 text-center font-data">{m.canViewFinancials ? '✓' : '—'}</td>
                  <td className="py-3 px-3 text-center font-data">{m.canManageSales ? '✓' : '—'}</td>
                  <td className="py-3 px-3 text-center font-data">{m.canManageConstruction ? '✓' : '—'}</td>
                  <td className="py-3 px-3 text-center font-data">{m.canManageDocuments ? '✓' : '—'}</td>
                  <td className="py-3 px-3 text-end">
                    {canManageAccess && (
                      <button
                        type="button"
                        onClick={() => void handleRemove(m.userId)}
                        className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                        <span>{isArabic ? 'سحب' : 'Révoquer'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {canManageAccess && availableUsers.length > 0 && (
          <form onSubmit={handleAssign} className="pt-4 border-t border-slate-100 space-y-4">
            <h4 className="text-xs font-bold text-slate-800">
              {isArabic ? 'منح صلاحية وصول لموظف جديد' : 'Attribuer l’accès à un nouvel employé'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FormField id="assign-user" label={t.projects.selectEmployee}>
                <select
                  id="assign-user"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className={inputBaseClass}
                  required
                >
                  <option value="">{isArabic ? '-- اختر موظفاً --' : '-- Sélectionner --'}</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.username})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="assign-role" label={t.projects.projectRole}>
                <select
                  id="assign-role"
                  value={projectRole}
                  onChange={(e) => setProjectRole(e.target.value as never)}
                  className={inputBaseClass}
                >
                  <option value="ProjectManager">ProjectManager</option>
                  <option value="SalesAgent">SalesAgent</option>
                  <option value="SiteEngineer">SiteEngineer</option>
                  <option value="Accountant">Accountant</option>
                </select>
              </FormField>

              <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-5">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canViewFinancials}
                    onChange={(e) => setCanViewFinancials(e.target.checked)}
                    className="accent-teal-800"
                  />
                  <span>{t.projects.permFinancials}</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canManageSales}
                    onChange={(e) => setCanManageSales(e.target.checked)}
                    className="accent-teal-800"
                  />
                  <span>{t.projects.permSales}</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canManageConstruction}
                    onChange={(e) => setCanManageConstruction(e.target.checked)}
                    className="accent-teal-800"
                  />
                  <span>{t.projects.permConstruction}</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canManageDocuments}
                    onChange={(e) => setCanManageDocuments(e.target.checked)}
                    className="accent-teal-800"
                  />
                  <span>{t.projects.permDocuments}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !selectedUserId}
                className="inline-flex items-center gap-1.5 rounded-md bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                <span>{t.projects.assignButton}</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
