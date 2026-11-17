import type { AppLanguage, AuthenticatedUser } from '@/types/erp';
import { canManageUsers } from '@/modules/technical-admin';
import { PageHeader } from '@/shared/components/PageHeader';
import { PlannedModuleWorkspace } from '@/shared/components/PlannedModuleWorkspace';

interface EmployeesPlannedViewProps {
  currentUser: AuthenticatedUser;
  language: AppLanguage;
  onNavigateHome: () => void;
  onNavigateUsersAdmin: () => void;
}

export function EmployeesPlannedView({
  currentUser,
  language,
  onNavigateHome,
  onNavigateUsersAdmin,
}: EmployeesPlannedViewProps) {
  const isArabic = language === 'ar';
  const showAdminUsers = canManageUsers(currentUser);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isArabic ? 'مرجع الموظفين والموارد البشرية (HR)' : 'Référentiel Employés (RH)'}
        subtitle={
          isArabic
            ? 'فصل سجل الموظفين والفرق الميدانية عن حسابات الدخول التقنية (User ≠ Employee).'
            : 'Séparation entre le dossier administratif Employé et le compte de connexion technique (User ≠ Employee).'
        }
        language={language}
        moduleCode="A"
        moduleState="PLANNED"
        breadcrumbs={[
          { label: isArabic ? 'مساحة المؤسسة' : 'Organisation', onClick: onNavigateHome },
          { label: isArabic ? 'الموظفون (HR)' : 'Employés (RH)' },
        ]}
      />

      <PlannedModuleWorkspace
        moduleCode="A"
        language={language}
        initialSubTab="employees-hr"
        extraColumns={[
          { ar: 'رقم التعريف المهني', fr: 'Matricule' },
          { ar: 'الاسم واللقب', fr: 'Nom & Prénom' },
          { ar: 'الوظيفة / المصلحة', fr: 'Poste / Service' },
          { ar: 'الطرف المركزي المرتبط', fr: 'Tiers lié' },
          { ar: 'حساب النظام المرتبط', fr: 'Compte utilisateur lié' },
        ]}
        linkedActionLabel={
          showAdminUsers
            ? (isArabic ? 'فتح حسابات المستخدمين والأدوار (الإدارة التقنية)' : 'Ouvrir Comptes & Rôles (Admin)')
            : undefined
        }
        onLinkedAction={showAdminUsers ? onNavigateUsersAdmin : undefined}
      />
    </div>
  );
}
