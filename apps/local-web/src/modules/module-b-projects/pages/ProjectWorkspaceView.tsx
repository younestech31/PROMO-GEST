import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MutableRefObject } from 'react';
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Coins,
  FileSignature,
  FileText,
  HardHat,
  KeyRound,
  Layers3,
  Package,
  Scale,
  Settings,
  ShieldAlert,
  Trash2,
  UsersRound,
} from 'lucide-react';
import type {
  AppLanguage,
  AssignProjectMemberRequest,
  AuthenticatedUser,
  ProjectDto,
  UpdateProjectRequest,
  UserDto,
} from '@/types/erp';
import type { ProjectWorkspaceSection } from '@/core/modules/routeTypes';
import { getModuleStateLabel } from '@/core/modules/moduleCodes';
import { apiClient, ApiError } from '@/core/api/apiClient';
import { getTranslations, translateApiError } from '@/core/localization/translations';
import { formatDzd, formatLocalDateTime } from '@/shared/utils/algerianFormat';
import { useAdministrativeReference } from '@/shared/hooks/useAdministrativeReference';
import {
  canManagePartyIdentity,
  canManageProjectAccess,
  canManageProjectCustomers,
  canManageProjects,
  canManageUsers,
  canReadPartyDirectory,
  canReadProjectCustomers,
  canUpdateProjectFinancialBudget,
} from '@/core/permissions/permissionPolicy';
import { canReadProjectDocuments, canUploadProjectDocuments } from '@/modules/module-k-documents';
import {
  canReadProjectSalesReservations,
  canManageProjectSalesReservations,
} from '@/modules/module-e-reservations';
import { validateCreateProject, type ValidationErrors } from '@/shared/utils/validation';
import { getModuleDefinition } from '@/core/modules/registry';
import type { ModuleCode } from '@/core/modules/moduleCodes';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState, ErrorBanner, LoadingSkeleton } from '@/shared/components/StateViews';
import { ProjectIdentityStrip, formatProjectStatus } from '@/shared/components/ProjectIdentityStrip';
import { FormField, inputBaseClass } from '@/shared/components/FormField';
import { ProjectStructureModal } from '@/modules/module-c-structure';
import { ProjectSalesReservationsModal } from '@/modules/module-e-reservations';
import { ProjectDocumentsModal } from '@/modules/module-k-documents';

const ProjectCustomerRegistryModal = lazy(() =>
  import('@/modules/module-d-customers-parties').then((module) => ({
    default: module.ProjectCustomerRegistryModal,
  }))
);
import { ContractsModulePage } from '@/modules/module-f-contracts';
import { FinanceModulePage } from '@/modules/module-g-finance';
import { ConstructionModulePage } from '@/modules/module-h-construction';
import { ProcurementModulePage } from '@/modules/module-i-procurement';
import { AccountingModulePage } from '@/modules/module-j-accounting';
import { ReportsWorkspaceView } from '@/modules/module-l-reporting';

interface ProjectWorkspaceViewProps {
  projectId: string;
  section: ProjectWorkspaceSection;
  currentUser: AuthenticatedUser;
  language: AppLanguage;
  isPinned: boolean;
  onTogglePin: (projectId: string) => void;
  onNavigateSection: (section: ProjectWorkspaceSection) => void;
  onNavigateOrgHome: () => void;
  onNavigateProjectsDirectory: () => void;
  onNavigateAudit: () => void;
  onProjectVerified: (project: ProjectDto) => void;
  onProjectVerificationFailed: (projectId: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  saveActionRef?: MutableRefObject<(() => Promise<boolean>) | null>;
  discardActionRef?: MutableRefObject<(() => void) | null>;
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
  { code: 'UnderConstruction', ar: 'قيد الإنجاز', fr: 'En construction' },
  { code: 'Commercialization', ar: 'قيد التسويق والبيع', fr: 'En commercialisation' },
  { code: 'Delivered', ar: 'مسلّم', fr: 'Livré' },
  { code: 'Suspended', ar: 'معلّق', fr: 'Suspendu' },
];

interface WorkspaceTabMeta {
  id: ProjectWorkspaceSection;
  ar: string;
  fr: string;
  moduleCode: string;
  planned?: boolean;
}

const WORKSPACE_TABS: WorkspaceTabMeta[] = [
  { id: 'overview', ar: 'نظرة المشروع', fr: 'Aperçu projet', moduleCode: 'B' },
  { id: 'structure', ar: 'الهيكل والوحدات', fr: 'Structure & Lots', moduleCode: 'C' },
  { id: 'customers', ar: 'الزبائن والمهتمون', fr: 'Clients & CRM', moduleCode: 'D' },
  { id: 'reservations', ar: 'الحجوزات الداخلية', fr: 'Réservations', moduleCode: 'E' },
  { id: 'contracts', ar: 'العقود', fr: 'Contrats', moduleCode: 'F', planned: true },
  { id: 'finance', ar: 'التحصيل والأقساط', fr: 'Finances', moduleCode: 'G', planned: true },
  { id: 'construction', ar: 'الأشغال والورشة', fr: 'Chantier', moduleCode: 'H', planned: true },
  { id: 'procurement', ar: 'المشتريات والمخزون', fr: 'Achats & Stocks', moduleCode: 'I', planned: true },
  { id: 'accounting', ar: 'المحاسبة SCF', fr: 'Comptabilité SCF', moduleCode: 'J', planned: true },
  { id: 'documents', ar: 'الوثائق', fr: 'Documents', moduleCode: 'K' },
  { id: 'reports', ar: 'التقارير', fr: 'Rapports', moduleCode: 'L' },
  { id: 'settings', ar: 'الإعدادات والفريق', fr: 'Paramètres & Équipe', moduleCode: 'B' },
];

export function ProjectWorkspaceView({
  projectId,
  section,
  currentUser,
  language,
  isPinned,
  onTogglePin,
  onNavigateSection,
  onNavigateOrgHome,
  onNavigateProjectsDirectory,
  onNavigateAudit,
  onProjectVerified,
  onProjectVerificationFailed,
  onDirtyChange,
  saveActionRef,
  discardActionRef,
}: ProjectWorkspaceViewProps) {
  const isArabic = language === 'ar';
  const t = getTranslations(language);
  const { reference, isLoading: referenceLoading, hasError: referenceError, retry: retryReference } =
    useAdministrativeReference();
  const wilayas = reference?.wilayas ?? [];

  const [project, setProject] = useState<ProjectDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [embeddedDirty, setEmbeddedDirty] = useState(false);

  // Settings & team state
  const [users, setUsers] = useState<UserDto[]>([]);
  const [editForm, setEditForm] = useState<UpdateProjectRequest | null>(null);
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const [memberForm, setMemberForm] = useState<AssignProjectMemberRequest>({
    userId: '',
    roleInProject: 'CommercialAgent',
    canViewFinancials: false,
    canManageSales: true,
    canManageConstruction: false,
    canManageDocuments: true,
  });
  const [teamError, setTeamError] = useState<string | null>(null);
  const [savingTeam, setSavingTeam] = useState(false);

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const languageRef = useRef(language);
  languageRef.current = language;
  const onProjectVerifiedRef = useRef(onProjectVerified);
  onProjectVerifiedRef.current = onProjectVerified;
  const onProjectVerificationFailedRef = useRef(onProjectVerificationFailed);
  onProjectVerificationFailedRef.current = onProjectVerificationFailed;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  const syncSettingsDraft = useCallback((p: ProjectDto) => {
    setEditForm({
      nameAr: p.nameAr,
      nameFr: p.nameFr,
      wilayaCode: p.wilayaCode,
      wilayaName: p.wilayaName,
      municipality: p.municipality,
      address: p.address ?? '',
      landTitleReference: p.landTitleReference ?? '',
      buildingPermitNumber: p.buildingPermitNumber ?? '',
      buildingPermitDate: p.buildingPermitDate ?? '',
      status: p.status,
      estimatedBudgetDzd: p.estimatedBudgetDzd,
      plannedBlocksCount: p.plannedBlocksCount,
      plannedUnitsCount: p.plannedUnitsCount,
      expectedConcurrencyStamp: p.concurrencyStamp,
    });
    onDirtyChangeRef.current(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadProject = async () => {
      setLoading(true);
      setLoadError(null);
      setEmbeddedDirty(false);
      try {
        const verified = await apiClient.getProject(projectId);
        if (cancelled) return;
        setProject(verified);
        syncSettingsDraft(verified);
        onProjectVerifiedRef.current(verified);

        if (canManageUsers(currentUserRef.current)) {
          try {
            const userList = await apiClient.listUsers();
            if (cancelled) return;
            const activeEmployees = userList.filter((u) => !u.isSystemAdministrator && u.isActive);
            setUsers(activeEmployees);
            setMemberForm((prev) => ({
              ...prev,
              userId: prev.userId || activeEmployees[0]?.id || '',
            }));
          } catch {
            if (!cancelled) setUsers([]);
          }
        }
      } catch (err) {
        if (cancelled) return;
        setProject(null);
        onDirtyChangeRef.current(false);
        onProjectVerificationFailedRef.current(projectId);
        if (err instanceof ApiError) {
          setLoadError(translateApiError(err.code, err.message, languageRef.current));
        } else {
          setLoadError(
            languageRef.current === 'ar'
              ? 'تعذر التحقق من صلاحية الوصول إلى هذا المشروع أو المشروع غير موجود.'
              : 'Impossible de vérifier l’accès à ce projet ou projet introuvable.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProject();
    return () => {
      cancelled = true;
      onDirtyChangeRef.current(false);
      if (saveActionRef) saveActionRef.current = null;
      if (discardActionRef) discardActionRef.current = null;
    };
  }, [projectId, syncSettingsDraft, saveActionRef, discardActionRef]);

  const refreshProjectSilently = async () => {
    try {
      const updated = await apiClient.getProject(projectId);
      setProject(updated);
      onProjectVerifiedRef.current(updated);
    } catch {
      // Ignore silent refresh error; primary actions surface errors explicitly
    }
  };

  const canEditMasterData = project ? canManageProjects(currentUser, project) : false;
  const canEditBudget = project ? canUpdateProjectFinancialBudget(currentUser, project) : false;
  const canEditTeam = project ? canManageProjectAccess(currentUser, project) : false;

  const isSettingsDirty = useMemo(() => {
    if (!project || !editForm || !canEditMasterData) return false;
    return (
      editForm.nameAr !== project.nameAr ||
      editForm.nameFr !== project.nameFr ||
      editForm.wilayaCode !== project.wilayaCode ||
      editForm.municipality !== project.municipality ||
      (editForm.address ?? '') !== (project.address ?? '') ||
      (editForm.landTitleReference ?? '') !== (project.landTitleReference ?? '') ||
      (editForm.buildingPermitNumber ?? '') !== (project.buildingPermitNumber ?? '') ||
      (editForm.buildingPermitDate ?? '') !== (project.buildingPermitDate ?? '') ||
      editForm.status !== project.status ||
      editForm.plannedBlocksCount !== project.plannedBlocksCount ||
      editForm.plannedUnitsCount !== project.plannedUnitsCount ||
      (canEditBudget && editForm.estimatedBudgetDzd !== project.estimatedBudgetDzd)
    );
  }, [project, editForm, canEditMasterData, canEditBudget]);

  useEffect(() => {
    setEmbeddedDirty(false);
  }, [section]);

  const overallDirty =
    (section === 'settings' && isSettingsDirty) ||
    (['structure', 'customers', 'reservations', 'documents'].includes(section) && embeddedDirty);

  useEffect(() => {
    onDirtyChangeRef.current(overallDirty);
  }, [overallDirty]);

  const saveSettings = useCallback(async (): Promise<boolean> => {
    if (!project || !editForm) return false;
    setSaveError(null);
    setSaveMessage(null);

    const selectedWilaya = wilayas.find((w) => w.code === editForm.wilayaCode);
    if (!selectedWilaya) {
      setSaveError(
        isArabic
          ? 'تعذر تحميل مرجع الولايات الرسمي. أعد المحاولة قبل الحفظ.'
          : 'Le référentiel officiel des wilayas est indisponible. Réessayez avant l’enregistrement.'
      );
      return false;
    }

    const validation = validateCreateProject(
      {
        code: project.code,
        nameAr: editForm.nameAr,
        nameFr: editForm.nameFr,
        wilayaCode: editForm.wilayaCode,
        wilayaName: selectedWilaya.canonicalDisplayName,
        municipality: editForm.municipality,
        address: editForm.address,
        landTitleReference: editForm.landTitleReference,
        buildingPermitNumber: editForm.buildingPermitNumber,
        buildingPermitDate: editForm.buildingPermitDate,
        status: editForm.status,
        estimatedBudgetDzd: editForm.estimatedBudgetDzd ?? 0,
        plannedBlocksCount: editForm.plannedBlocksCount,
        plannedUnitsCount: editForm.plannedUnitsCount,
      },
      language
    );
    setFormErrors(validation);
    if (Object.keys(validation).length > 0) return false;

    setSavingSettings(true);
    try {
      const updated = await apiClient.updateProject(project.id, {
        ...editForm,
        wilayaName: selectedWilaya.canonicalDisplayName,
        buildingPermitDate: editForm.buildingPermitDate || null,
        estimatedBudgetDzd: canEditBudget ? editForm.estimatedBudgetDzd : null,
        expectedConcurrencyStamp: project.concurrencyStamp,
      });
      setProject(updated);
      syncSettingsDraft(updated);
      onProjectVerifiedRef.current(updated);
      setSaveMessage(
        isArabic ? 'تم حفظ إعدادات المشروع بنجاح.' : 'Les paramètres du projet ont été enregistrés.'
      );
      return true;
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? translateApiError(err.code, err.message, language)
          : (isArabic ? 'فشل تحديث إعدادات المشروع.' : 'Échec de la mise à jour du projet.')
      );
      return false;
    } finally {
      setSavingSettings(false);
    }
  }, [canEditBudget, editForm, isArabic, language, project, syncSettingsDraft, wilayas]);

  useEffect(() => {
    if (!saveActionRef) return;
    saveActionRef.current = section === 'settings' && isSettingsDirty ? saveSettings : null;
  }, [section, isSettingsDirty, saveActionRef, saveSettings]);

  useEffect(() => {
    if (!discardActionRef) return;
    discardActionRef.current = () => {
      if (project) syncSettingsDraft(project);
      setEmbeddedDirty(false);
    };
    return () => { discardActionRef.current = null; };
  }, [discardActionRef, project, syncSettingsDraft]);

  const handleSaveSettings = async (event: FormEvent) => {
    event.preventDefault();
    await saveSettings();
  };

  const handleAssignMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!project || !memberForm.userId) return;
    setTeamError(null);
    setSavingTeam(true);
    try {
      const updated = await apiClient.assignProjectMember(project.id, memberForm);
      setProject(updated);
      onProjectVerified(updated);
    } catch (err) {
      setTeamError(
        err instanceof ApiError
          ? translateApiError(err.code, err.message, language)
          : (isArabic ? 'تعذر منح الصلاحية للعضو.' : 'Impossible d’attribuer l’accès au membre.')
      );
    } finally {
      setSavingTeam(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!project) return;
    setTeamError(null);
    try {
      const updated = await apiClient.removeProjectMember(project.id, userId);
      setProject(updated);
      onProjectVerified(updated);
    } catch (err) {
      setTeamError(
        err instanceof ApiError
          ? translateApiError(err.code, err.message, language)
          : (isArabic ? 'تعذر سحب صلاحية العضو.' : 'Impossible de révoquer le membre.')
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="space-y-6">
        <ErrorBanner message={loadError ?? (isArabic ? 'المشروع غير متاح.' : 'Projet indisponible.')} />
        <EmptyState
          icon={<ShieldAlert className="h-9 w-9 text-amber-700" aria-hidden="true" />}
          title={isArabic ? 'تعذر فتح مساحة المشروع' : 'Impossible d’ouvrir l’espace projet'}
          description={
            isArabic
              ? 'قد يكون تم سحب صلاحيتك لهذا المشروع أو أن الرمز غير صالح. اختر مشروعاً مصرحاً به من الدليل.'
              : 'Votre accès a peut-être été révoqué ou l’identifiant est invalide. Sélectionnez un projet autorisé.'
          }
          action={
            <button
              type="button"
              onClick={onNavigateProjectsDirectory}
              className="rounded-md bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900"
            >
              {isArabic ? 'العودة إلى دليل المشاريع' : 'Retour à l’annuaire des projets'}
            </button>
          }
        />
      </div>
    );
  }

  const activeTabMeta = WORKSPACE_TABS.find((tab) => tab.id === section) ?? WORKSPACE_TABS[0];
  const canReadCustomers = canReadProjectCustomers(currentUser, project);
  const canReadReservations = canReadProjectSalesReservations(currentUser, project);
  const canReadDocs = canReadProjectDocuments(currentUser, project);

  return (
    <div className="space-y-5">
      {/* Persistent Project Identity Strip */}
      <ProjectIdentityStrip
        project={project}
        language={language}
        isPinned={isPinned}
        onTogglePin={() => onTogglePin(project.id)}
        onBrowseDirectory={onNavigateProjectsDirectory}
      />

      {/* Section PageHeader */}
      {section !== 'reports' && (
        <PageHeader
          title={isArabic ? activeTabMeta.ar : activeTabMeta.fr}
          subtitle={`${project.code} · ${isArabic ? project.nameAr : project.nameFr}`}
          language={language}
          moduleCode={activeTabMeta.moduleCode}
          moduleState={getModuleDefinition(activeTabMeta.moduleCode as ModuleCode).state}
          breadcrumbs={[
            { label: isArabic ? 'المؤسسة' : 'Organisation', onClick: onNavigateOrgHome },
            { label: isArabic ? 'المشاريع' : 'Projets', onClick: onNavigateProjectsDirectory },
            { label: project.code, onClick: () => onNavigateSection('overview') },
            { label: isArabic ? activeTabMeta.ar : activeTabMeta.fr },
          ]}
        />
      )}

      {/* Active Section Content */}
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">
                {isArabic ? 'العمارات المسجلة / المخططة' : 'Bâtiments (réel / prévu)'}
              </div>
              <div className="mt-2 text-2xl font-bold font-data text-slate-900">
                {project.actualBuildingsCount}{' '}
                <span className="text-sm font-normal text-slate-500">/ {project.plannedBlocksCount}</span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">
                {isArabic ? 'الوحدات المسجلة / المخططة' : 'Unités (réelles / prévues)'}
              </div>
              <div className="mt-2 text-2xl font-bold font-data text-slate-900">
                {project.actualUnitsCount}{' '}
                <span className="text-sm font-normal text-slate-500">/ {project.plannedUnitsCount}</span>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">
                {isArabic ? 'الميزانية التقديرية (DZD)' : 'Budget estimatif (DZD)'}
              </div>
              <div className="mt-2 text-xl font-bold font-data text-slate-900">
                {project.estimatedBudgetDzd === null ? '—' : formatDzd(project.estimatedBudgetDzd, language)}
              </div>
              {project.estimatedBudgetDzd === null && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {isArabic ? 'محجوب — صلاحية الاطلاع المالي غير مفعّلة.' : 'Masqué — droit financier requis sur le projet.'}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-500">
                {isArabic ? 'أعضاء فريق المشروع' : 'Membres habilités'}
              </div>
              <div className="mt-2 text-2xl font-bold font-data text-slate-900">{project.members.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                {isArabic ? 'البطاقة التقنية والعقارية للمشروع' : 'Fiche foncière et administrative'}
              </h3>
              <dl className="mt-4 space-y-2.5 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{isArabic ? 'الرمز' : 'Code'}</dt>
                  <dd className="font-data font-bold text-slate-900" dir="ltr">{project.code}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{isArabic ? 'المرحلة' : 'Statut'}</dt>
                  <dd className="font-medium text-slate-900">{formatProjectStatus(project.status, language)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{isArabic ? 'الموقع' : 'Localisation'}</dt>
                  <dd className="text-slate-900 text-end">
                    <span className="font-data">{project.wilayaCode}</span> {project.wilayaName} — {project.municipality}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{isArabic ? 'العنوان الدقيق' : 'Adresse'}</dt>
                  <dd className="text-slate-900 text-end">{project.address ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{isArabic ? 'المرجع العقاري / الدفتر' : 'Référence foncière'}</dt>
                  <dd className="font-data text-slate-900" dir="ltr">{project.landTitleReference ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{isArabic ? 'رقم رخصة البناء' : 'Permis de construire'}</dt>
                  <dd className="font-data text-slate-900" dir="ltr">{project.buildingPermitNumber ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">{isArabic ? 'تاريخ الإنشاء' : 'Créé le'}</dt>
                  <dd className="font-data text-slate-600">{formatLocalDateTime(project.createdAtUtc, language)}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                {isArabic ? 'الانتقال المباشر لوحدات المشروع' : 'Accès rapide aux modules du projet'}
              </h3>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { id: 'structure' as const, moduleCode: 'C' as ModuleCode, icon: Layers3, ar: 'ج. الهيكل والوحدات', fr: 'C. Structure & Lots' },
                  { id: 'customers' as const, moduleCode: 'D' as ModuleCode, icon: UsersRound, ar: 'د. الزبائن والمهتمون', fr: 'D. Clients & CRM' },
                  { id: 'reservations' as const, moduleCode: 'E' as ModuleCode, icon: CalendarClock, ar: 'هـ. الحجوزات الداخلية', fr: 'E. Réservations' },
                  { id: 'documents' as const, moduleCode: 'K' as ModuleCode, icon: FileText, ar: 'ك. الوثائق SHA-256', fr: 'K. Documents' },
                  { id: 'contracts' as const, moduleCode: 'F' as ModuleCode, icon: FileSignature, ar: 'و. العقود', fr: 'F. Contrats' },
                  { id: 'finance' as const, moduleCode: 'G' as ModuleCode, icon: Coins, ar: 'ز. التحصيل', fr: 'G. Finances' },
                  { id: 'construction' as const, moduleCode: 'H' as ModuleCode, icon: HardHat, ar: 'ح. الأشغال', fr: 'H. Chantier' },
                  { id: 'procurement' as const, moduleCode: 'I' as ModuleCode, icon: Package, ar: 'ط. المشتريات', fr: 'I. Achats' },
                  { id: 'accounting' as const, moduleCode: 'J' as ModuleCode, icon: Scale, ar: 'ي. المحاسبة SCF', fr: 'J. Comptabilité' },
                  { id: 'settings' as const, moduleCode: 'B' as ModuleCode, icon: Settings, ar: 'ب. الإعدادات والفريق', fr: 'B. Paramètres & Équipe' },
                ].map((item) => {
                  const Icon = item.icon;
                  const state = getModuleDefinition(item.moduleCode).state;
                  const isPlanned = state === 'PLANNED';
                  const isPartial = state === 'PARTIALLY_IMPLEMENTED';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigateSection(item.id)}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2.5 text-start text-xs font-semibold text-slate-800 hover:border-teal-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon className={`h-4 w-4 shrink-0 ${isPlanned ? 'text-amber-700' : 'text-teal-800'}`} aria-hidden="true" />
                        <span className="truncate">{isArabic ? item.ar : item.fr}</span>
                      </span>
                      <span
                        className={`text-[10px] font-medium shrink-0 ${
                          isPlanned ? 'text-amber-800' : isPartial ? 'text-amber-800' : 'text-emerald-700'
                        }`}
                      >
                        {getModuleStateLabel(state, language)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {section === 'structure' && (
        <ProjectStructureModal
          project={project}
          language={language}
          mode="embedded"
          onStructureChanged={() => void refreshProjectSilently()}
          onDirtyChange={setEmbeddedDirty}
        />
      )}

      {section === 'customers' && (
        canReadCustomers ? (
          <Suspense fallback={<LoadingSkeleton rows={3} />}>
            <ProjectCustomerRegistryModal
              project={project}
              language={language}
              canManage={canManageProjectCustomers(currentUser, project)}
              canReadPartyDirectory={canReadPartyDirectory(currentUser)}
              canManagePartyIdentity={canManagePartyIdentity(currentUser)}
              mode="embedded"
              onDirtyChange={setEmbeddedDirty}
            />
          </Suspense>
        ) : (
          <ErrorBanner
            message={
              isArabic
                ? 'ليس لديك صلاحية الاطلاع على سجل زبائن هذا المشروع.'
                : 'Vous n’êtes pas autorisé à consulter les clients de ce projet.'
            }
          />
        )
      )}

      {section === 'reservations' && (
        canReadReservations ? (
          <ProjectSalesReservationsModal
            project={project}
            language={language}
            canManage={canManageProjectSalesReservations(currentUser, project)}
            mode="embedded"
            onDirtyChange={setEmbeddedDirty}
          />
        ) : (
          <ErrorBanner
            message={
              isArabic
                ? 'ليس لديك صلاحية الاطلاع على الحجوزات الداخلية لهذا المشروع.'
                : 'Vous n’êtes pas autorisé à consulter les réservations de ce projet.'
            }
          />
        )
      )}

      {section === 'contracts' && (
        <ContractsModulePage
          projectId={project.id}
          language={language}
          onGoToDocuments={() => onNavigateSection('documents')}
        />
      )}

      {section === 'finance' && (
        <FinanceModulePage projectId={project.id} language={language} />
      )}

      {section === 'construction' && (
        <ConstructionModulePage projectId={project.id} language={language} />
      )}

      {section === 'procurement' && (
        <ProcurementModulePage projectId={project.id} language={language} />
      )}

      {section === 'accounting' && (
        <AccountingModulePage projectId={project.id} language={language} />
      )}

      {section === 'documents' && (
        canReadDocs ? (
          <ProjectDocumentsModal
            project={project}
            language={language}
            canUpload={canUploadProjectDocuments(currentUser, project)}
            mode="embedded"
            onDirtyChange={setEmbeddedDirty}
          />
        ) : (
          <ErrorBanner
            message={
              isArabic
                ? 'ليس لديك صلاحية الاطلاع على وثائق هذا المشروع.'
                : 'Vous n’êtes pas autorisé à consulter les documents de ce projet.'
            }
          />
        )
      )}

      {section === 'reports' && (
        <ReportsWorkspaceView
          currentUser={currentUser}
          language={language}
          projects={[project]}
          projectContext={project}
          onNavigateHome={onNavigateOrgHome}
          onNavigateAudit={onNavigateAudit}
          onOpenProjectWorkspace={() => onNavigateSection('overview')}
        />
      )}

      {section === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Master data edit */}
          <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Building2 className="h-4 w-4 text-teal-800" aria-hidden="true" />
                <span>{isArabic ? 'إعدادات وبيانات المشروع' : 'Paramètres du projet'}</span>
              </div>
              {isSettingsDirty && (
                <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                  {isArabic ? 'تغييرات غير محفوظة' : 'Modifications non enregistrées'}
                </span>
              )}
            </div>

            {saveError && <ErrorBanner message={saveError} />}
            {saveMessage && (
              <div role="status" className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{saveMessage}</span>
              </div>
            )}

            {!canEditMasterData && (
              <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {isArabic
                  ? 'صلاحية تعديل البيانات الأساسية تتطلب تعيينك كمدير للمشروع (ProjectManager) مع إذن projects.manage.'
                  : 'La modification des données exige le rôle Chef de Projet et la permission projects.manage.'}
              </p>
            )}

            {editForm && (
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormField id="ws-name-ar" label={t.projects.fieldNameAr} error={formErrors.nameAr}>
                    <input
                      id="ws-name-ar"
                      disabled={!canEditMasterData}
                      value={editForm.nameAr}
                      onChange={(e) => setEditForm((f) => (f ? { ...f, nameAr: e.target.value } : f))}
                      className={inputBaseClass}
                    />
                  </FormField>

                  <FormField id="ws-name-fr" label={t.projects.fieldNameFr}>
                    <input
                      id="ws-name-fr"
                      dir="ltr"
                      disabled={!canEditMasterData}
                      value={editForm.nameFr}
                      onChange={(e) => setEditForm((f) => (f ? { ...f, nameFr: e.target.value } : f))}
                      className={inputBaseClass}
                    />
                  </FormField>

                  <FormField id="ws-status" label={t.projects.fieldStatus}>
                    <select
                      id="ws-status"
                      disabled={!canEditMasterData}
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => (f ? { ...f, status: e.target.value } : f))}
                      className={inputBaseClass}
                    >
                      {PROJECT_STATUSES.map((s) => (
                        <option key={s.code} value={s.code}>{isArabic ? s.ar : s.fr}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField id="ws-wilaya" label={t.projects.fieldWilaya}>
                    {referenceError && (
                      <div className="text-[11px] text-red-700 mb-1">
                        <button type="button" onClick={retryReference} className="underline">
                          {isArabic ? 'إعادة تحميل الولايات' : 'Recharger wilayas'}
                        </button>
                      </div>
                    )}
                    <select
                      id="ws-wilaya"
                      disabled={!canEditMasterData || !reference || referenceLoading}
                      value={editForm.wilayaCode}
                      onChange={(e) => {
                        const found = wilayas.find((w) => w.code === e.target.value);
                        if (!found) return;
                        setEditForm((f) =>
                          f ? { ...f, wilayaCode: found.code, wilayaName: found.canonicalDisplayName } : f
                        );
                      }}
                      className={inputBaseClass}
                    >
                      {!reference && (
                        <option value={editForm.wilayaCode}>
                          {editForm.wilayaCode} — {editForm.wilayaName}
                        </option>
                      )}
                      {wilayas.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.code} — {isArabic ? w.nameAr : w.nameFr}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField id="ws-municipality" label={t.projects.fieldMunicipality} error={formErrors.municipality}>
                    <input
                      id="ws-municipality"
                      disabled={!canEditMasterData}
                      value={editForm.municipality}
                      onChange={(e) => setEditForm((f) => (f ? { ...f, municipality: e.target.value } : f))}
                      className={inputBaseClass}
                    />
                  </FormField>

                  {canEditBudget && (
                    <FormField id="ws-budget" label={t.projects.fieldBudgetDzd} error={formErrors.estimatedBudgetDzd}>
                      <input
                        id="ws-budget"
                        type="number"
                        min="0"
                        step="0.01"
                        dir="ltr"
                        disabled={!canEditMasterData}
                        value={editForm.estimatedBudgetDzd ?? 0}
                        onChange={(e) =>
                          setEditForm((f) =>
                            f ? { ...f, estimatedBudgetDzd: Number(e.target.value) } : f
                          )
                        }
                        className={`${inputBaseClass} font-data`}
                      />
                    </FormField>
                  )}

                  <FormField id="ws-blocks" label={t.projects.fieldBlocks}>
                    <input
                      id="ws-blocks"
                      type="number"
                      min="0"
                      dir="ltr"
                      disabled={!canEditMasterData}
                      value={editForm.plannedBlocksCount}
                      onChange={(e) =>
                        setEditForm((f) =>
                          f ? { ...f, plannedBlocksCount: Number(e.target.value) } : f
                        )
                      }
                      className={`${inputBaseClass} font-data`}
                    />
                  </FormField>

                  <FormField id="ws-units" label={t.projects.fieldUnits}>
                    <input
                      id="ws-units"
                      type="number"
                      min="0"
                      dir="ltr"
                      disabled={!canEditMasterData}
                      value={editForm.plannedUnitsCount}
                      onChange={(e) =>
                        setEditForm((f) =>
                          f ? { ...f, plannedUnitsCount: Number(e.target.value) } : f
                        )
                      }
                      className={`${inputBaseClass} font-data`}
                    />
                  </FormField>

                  <div className="sm:col-span-2">
                    <FormField id="ws-address" label={t.projects.fieldAddress}>
                      <input
                        id="ws-address"
                        disabled={!canEditMasterData}
                        value={editForm.address ?? ''}
                        onChange={(e) => setEditForm((f) => (f ? { ...f, address: e.target.value } : f))}
                        className={inputBaseClass}
                      />
                    </FormField>
                  </div>

                  <FormField id="ws-land" label={t.projects.fieldLandTitle}>
                    <input
                      id="ws-land"
                      dir="ltr"
                      disabled={!canEditMasterData}
                      value={editForm.landTitleReference ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => (f ? { ...f, landTitleReference: e.target.value } : f))
                      }
                      className={`${inputBaseClass} font-data`}
                    />
                  </FormField>

                  <FormField id="ws-permit" label={t.projects.fieldPermitNo}>
                    <input
                      id="ws-permit"
                      dir="ltr"
                      disabled={!canEditMasterData}
                      value={editForm.buildingPermitNumber ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => (f ? { ...f, buildingPermitNumber: e.target.value } : f))
                      }
                      className={`${inputBaseClass} font-data`}
                    />
                  </FormField>
                </div>

                {canEditMasterData && (
                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={!isSettingsDirty || savingSettings}
                      onClick={() => syncSettingsDraft(project)}
                      className="rounded border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {isArabic ? 'استعادة القيم الأصلية' : 'Réinitialiser'}
                    </button>
                    <button
                      type="submit"
                      disabled={savingSettings || !reference || !isSettingsDirty}
                      className="rounded bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
                    >
                      {savingSettings ? (isArabic ? 'جارٍ الحفظ...' : 'Enregistrement...') : t.users.save}
                    </button>
                  </div>
                )}
              </form>
            )}
          </section>

          {/* Team & access control */}
          <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold text-slate-900">
              <KeyRound className="h-4 w-4 text-teal-800" aria-hidden="true" />
              <span>{t.projects.modalAccessTitle}</span>
            </div>

            {teamError && <ErrorBanner message={teamError} />}

            {project.members.length === 0 ? (
              <p className="rounded border border-dashed border-slate-200 py-5 text-center text-xs text-slate-500">
                {t.projects.noMembersYet}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 rounded border border-slate-200">
                {project.members.map((m) => (
                  <div key={m.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3.5 py-3">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {m.fullName} <span className="font-data text-slate-500">({m.username})</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {PROJECT_ROLES.find((r) => r.code === m.roleInProject)?.[language] ?? m.roleInProject}
                        {' · '}
                        {[
                          m.canViewFinancials ? t.projects.permFinancials : null,
                          m.canManageSales ? t.projects.permSales : null,
                          m.canManageConstruction ? t.projects.permConstruction : null,
                          m.canManageDocuments ? t.projects.permDocuments : null,
                        ]
                          .filter(Boolean)
                          .join(' / ') || '—'}
                      </div>
                    </div>
                    {canEditTeam && (
                      <button
                        type="button"
                        onClick={() => void handleRemoveMember(m.userId)}
                        className="inline-flex items-center gap-1 rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 self-start sm:self-center"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.projects.removeMember}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canEditTeam ? (
              <form onSubmit={handleAssignMember} className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ClipboardList className="h-3.5 w-3.5 text-teal-800" aria-hidden="true" />
                  <span>{t.projects.assignMemberTitle}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField id="ws-pm-user" label={t.projects.selectEmployee}>
                    <select
                      id="ws-pm-user"
                      value={memberForm.userId}
                      onChange={(e) => setMemberForm((m) => ({ ...m, userId: e.target.value }))}
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
                  <FormField id="ws-pm-role" label={t.projects.projectRole}>
                    <select
                      id="ws-pm-role"
                      value={memberForm.roleInProject}
                      onChange={(e) => setMemberForm((m) => ({ ...m, roleInProject: e.target.value }))}
                      className={inputBaseClass}
                    >
                      {PROJECT_ROLES.map((r) => (
                        <option key={r.code} value={r.code}>{isArabic ? r.ar : r.fr}</option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={memberForm.canViewFinancials}
                      onChange={(e) => setMemberForm((m) => ({ ...m, canViewFinancials: e.target.checked }))}
                      className="accent-teal-800"
                    />
                    <span>{t.projects.permFinancials}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={memberForm.canManageSales}
                      onChange={(e) => setMemberForm((m) => ({ ...m, canManageSales: e.target.checked }))}
                      className="accent-teal-800"
                    />
                    <span>{t.projects.permSales}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={memberForm.canManageConstruction}
                      onChange={(e) => setMemberForm((m) => ({ ...m, canManageConstruction: e.target.checked }))}
                      className="accent-teal-800"
                    />
                    <span>{t.projects.permConstruction}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={memberForm.canManageDocuments}
                      onChange={(e) => setMemberForm((m) => ({ ...m, canManageDocuments: e.target.checked }))}
                      className="accent-teal-800"
                    />
                    <span>{t.projects.permDocuments}</span>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingTeam || !memberForm.userId}
                    className="rounded bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
                  >
                    {t.projects.assignButton}
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-xs text-slate-500">
                {isArabic
                  ? 'إدارة فريق المشروع تتطلب صلاحية projects.access.manage.'
                  : 'La gestion de l’équipe exige la permission projects.access.manage.'}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
