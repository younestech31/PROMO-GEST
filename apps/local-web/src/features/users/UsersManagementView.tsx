import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, Plus, ShieldCheck, UserCheck, UserMinus, UserPen, X } from 'lucide-react';
import type {
  AppLanguage,
  CreateEmployeeRequest,
  RoleDto,
  UpdateEmployeeRequest,
  UserDto,
} from '../../types/erp';
import { getTranslations, translateApiError } from '../../localization/translations';
import { formatLocalDateTime } from '../../utils/algerianFormat';
import { checkPasswordStrength, validateCreateEmployee, type ValidationErrors } from '../../utils/validation';
import { apiClient, ApiError } from '../../services/apiClient';
import { FormField, inputBaseClass } from '../../components/FormField';

interface UsersManagementViewProps {
  language: AppLanguage;
}

export function UsersManagementView({ language }: UsersManagementViewProps) {
  const t = getTranslations(language);

  const [users, setUsers] = useState<UserDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [resetUser, setResetUser] = useState<UserDto | null>(null);

  const [createForm, setCreateForm] = useState<CreateEmployeeRequest>({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    preferredLanguage: language,
    roleCodes: ['COMMERCIAL_MANAGER'],
  });
  const [editForm, setEditForm] = useState<UpdateEmployeeRequest>({
    fullName: '',
    email: '',
    phone: '',
    preferredLanguage: 'ar',
    roleCodes: [],
  });
  const [newPassword, setNewPassword] = useState('');
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, rolesData] = await Promise.all([
        apiClient.listUsers(),
        apiClient.listRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(translateApiError(err.code, err.message, language));
      } else {
        setError(language === 'ar' ? 'تعذر تحميل قائمة الموظفين.' : 'Impossible de charger les comptes employés.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const employeeAssignableRoles = roles.filter((r) => !r.isSystemRole);

  const toggleRole = (code: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const validation = validateCreateEmployee(createForm, language);
    setFormErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSubmitting(true);
    try {
      const created = await apiClient.createEmployee(createForm);
      setUsers((prev) => [...prev, created]);
      setCreateOpen(false);
      setCreateForm({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        preferredLanguage: language,
        roleCodes: ['COMMERCIAL_MANAGER'],
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(translateApiError(err.code, err.message, language));
      } else {
        setModalError(language === 'ar' ? 'فشل إنشاء حساب الموظف.' : 'Échec de la création du compte.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: UserDto) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      preferredLanguage: user.preferredLanguage,
      roleCodes: user.roleCodes,
    });
    setFormErrors({});
    setModalError(null);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setModalError(null);

    if (!editForm.fullName.trim() || !editForm.email.trim()) {
      setModalError(language === 'ar' ? 'الاسم والبريد الإلكتروني مطلوبان.' : 'Nom complet et e-mail requis.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await apiClient.updateEmployee(editingUser.id, editForm);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(translateApiError(err.code, err.message, language));
      } else {
        setModalError(language === 'ar' ? 'فشل تحديث بيانات الموظف.' : 'Échec de la mise à jour.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserDto) => {
    setError(null);
    try {
      const updated = await apiClient.setUserStatus(user.id, !user.isActive);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(translateApiError(err.code, err.message, language));
      }
    }
  };

  const handleResetPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    setModalError(null);

    if (!checkPasswordStrength(newPassword).valid) {
      setModalError(t.setup.passwordHint);
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.resetUserPassword(resetUser.id, newPassword);
      setResetUser(null);
      setNewPassword('');
    } catch (err) {
      if (err instanceof ApiError) {
        setModalError(translateApiError(err.code, err.message, language));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabel = (code: string) => {
    const found = roles.find((r) => r.code === code);
    if (!found) return code;
    return language === 'ar' ? found.nameAr : found.nameFr;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.users.title}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.users.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormErrors({});
            setModalError(null);
            setCreateOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>{t.users.createButton}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            <div className="h-9 bg-slate-100 rounded animate-pulse" />
            <div className="h-9 bg-slate-100 rounded animate-pulse" />
            <div className="h-9 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 text-start">{t.users.tableUsername}</th>
                  <th className="py-3 px-4 text-start">{t.users.tableFullName}</th>
                  <th className="py-3 px-4 text-start">{t.users.tableRoles}</th>
                  <th className="py-3 px-4 text-start">{t.users.tableStatus}</th>
                  <th className="py-3 px-4 text-start">{t.users.tableLastLogin}</th>
                  <th className="py-3 px-4 text-end">{t.users.tableActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isLocked = Boolean(u.lockoutEndUtc && new Date(u.lockoutEndUtc).getTime() > Date.now());
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-data text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{u.username}</span>
                          {u.isSystemAdministrator && (
                            <span title={t.users.sysAdminLabel} className="text-teal-800">
                              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{u.fullName}</div>
                        <div className="text-xs text-slate-500 font-data">{u.email}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {u.roleCodes.map(roleLabel).join(' · ')}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        {isLocked ? (
                          <span className="text-amber-700">{t.users.statusLocked}</span>
                        ) : u.isActive ? (
                          <span className="text-emerald-700">{t.users.statusActive}</span>
                        ) : (
                          <span className="text-red-700">{t.users.statusInactive}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-data text-slate-600">
                        {formatLocalDateTime(u.lastLoginAtUtc, language)}
                      </td>
                      <td className="py-3 px-4 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                          >
                            <UserPen className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t.users.editRoles}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setResetUser(u);
                              setNewPassword('');
                              setModalError(null);
                            }}
                            className="inline-flex items-center gap-1 rounded border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                          >
                            <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{t.users.resetPassword}</span>
                          </button>

                          {!u.isSystemAdministrator && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                                u.isActive
                                  ? 'border-red-200 text-red-700 hover:bg-red-50'
                                  : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {u.isActive ? (
                                <>
                                  <UserMinus className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>{t.users.deactivate}</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>{t.users.activate}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Employee Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-employee-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <h2 id="create-employee-title" className="text-base font-bold text-slate-900">
                {t.users.modalCreateTitle}
              </h2>
              <button
                type="button"
                aria-label={t.users.cancel}
                onClick={() => setCreateOpen(false)}
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

            <form onSubmit={handleCreateSubmit} noValidate className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField id="emp-username" label={t.users.fieldUsername} error={formErrors.username}>
                  <input
                    id="emp-username"
                    type="text"
                    dir="ltr"
                    value={createForm.username}
                    onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="emp-fullname" label={t.users.fieldFullName} error={formErrors.fullName}>
                  <input
                    id="emp-fullname"
                    type="text"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                    className={inputBaseClass}
                  />
                </FormField>

                <FormField id="emp-email" label={t.users.fieldEmail} error={formErrors.email}>
                  <input
                    id="emp-email"
                    type="email"
                    dir="ltr"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="emp-phone" label={t.users.fieldPhone}>
                  <input
                    id="emp-phone"
                    type="tel"
                    dir="ltr"
                    value={createForm.phone ?? ''}
                    onChange={(e) => setCreateForm((p) => ({ ...p, phone: e.target.value }))}
                    className={`${inputBaseClass} font-data`}
                  />
                </FormField>

                <FormField id="emp-password" label={t.users.fieldPassword} error={formErrors.password}>
                  <input
                    id="emp-password"
                    type="password"
                    dir="ltr"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                    className={inputBaseClass}
                  />
                </FormField>

                <FormField id="emp-lang" label={t.users.fieldLanguage}>
                  <select
                    id="emp-lang"
                    value={createForm.preferredLanguage}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, preferredLanguage: e.target.value as AppLanguage }))
                    }
                    className={inputBaseClass}
                  >
                    <option value="ar">{t.languageArabic}</option>
                    <option value="fr">{t.languageFrench}</option>
                  </select>
                </FormField>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-2">
                  {t.users.fieldRoles}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {employeeAssignableRoles.map((r) => (
                    <label
                      key={r.id}
                      className="flex items-start gap-2 rounded border border-slate-200 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={createForm.roleCodes.includes(r.code)}
                        onChange={() =>
                          toggleRole(r.code, createForm.roleCodes, (next) =>
                            setCreateForm((p) => ({ ...p, roleCodes: next }))
                          )
                        }
                        className="mt-0.5 accent-teal-800"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">
                          {language === 'ar' ? r.nameAr : r.nameFr}
                        </div>
                        <div className="text-slate-500">
                          {language === 'ar' ? r.descriptionAr : r.descriptionFr}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {formErrors.roleCodes && (
                  <p role="alert" className="text-xs font-medium text-red-700 mt-1">
                    {formErrors.roleCodes}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
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

      {/* Edit Employee Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-employee-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 id="edit-employee-title" className="text-base font-bold text-slate-900">
                {t.users.modalEditTitle} ({editingUser.username})
              </h2>
              <button
                type="button"
                aria-label={t.users.cancel}
                onClick={() => setEditingUser(null)}
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

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <FormField id="edit-fullname" label={t.users.fieldFullName}>
                <input
                  id="edit-fullname"
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                  className={inputBaseClass}
                />
              </FormField>

              <FormField id="edit-email" label={t.users.fieldEmail}>
                <input
                  id="edit-email"
                  type="email"
                  dir="ltr"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  className={`${inputBaseClass} font-data`}
                />
              </FormField>

              {!editingUser.isSystemAdministrator && (
                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-2">
                    {t.users.fieldRoles}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {employeeAssignableRoles.map((r) => (
                      <label
                        key={r.id}
                        className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={editForm.roleCodes.includes(r.code)}
                          onChange={() =>
                            toggleRole(r.code, editForm.roleCodes, (next) =>
                              setEditForm((p) => ({ ...p, roleCodes: next }))
                            )
                          }
                          className="accent-teal-800"
                        />
                        <span>{language === 'ar' ? r.nameAr : r.nameFr}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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

      {/* Reset Password Modal */}
      {resetUser && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-pw-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 id="reset-pw-title" className="text-base font-bold text-slate-900">
                {t.users.modalResetTitle} ({resetUser.username})
              </h2>
              <button
                type="button"
                aria-label={t.users.cancel}
                onClick={() => setResetUser(null)}
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

            <form onSubmit={handleResetPasswordSubmit} className="mt-4 space-y-4">
              <FormField
                id="reset-new-pw"
                label={t.users.fieldNewPassword}
                hint={t.setup.passwordHint}
              >
                <input
                  id="reset-new-pw"
                  type="password"
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputBaseClass}
                />
              </FormField>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
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
    </div>
  );
}
