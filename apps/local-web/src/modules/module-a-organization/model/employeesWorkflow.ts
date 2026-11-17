import type { AppLanguage } from "@/types/erp";
import type { PlannedSubWorkflowItem } from "@/shared/components/PlannedModuleShell";

export const EMPLOYEES_HR_WORKFLOWS: readonly PlannedSubWorkflowItem[] = [
  {
    id: 'employees-hr',
    label: { ar: 'سجل الموظفين (HR)', fr: 'Référentiel Employés (RH)' },
    state: 'PLANNED',
    description: {
      ar: 'فصل الملف الإداري والوظيفي للموظف عن حساب الدخول التقني (User ≠ Employee).',
      fr: 'Séparation entre le dossier administratif Employé et le compte de connexion technique (User ≠ Employee).',
    },
    columns: [
      { ar: 'رقم التعريف المهني', fr: 'Matricule' },
      { ar: 'الاسم واللقب', fr: 'Nom & Prénom' },
      { ar: 'الوظيفة / المصلحة', fr: 'Poste / Service' },
      { ar: 'الطرف المركزي المرتبط', fr: 'Tiers lié' },
      { ar: 'حساب النظام المرتبط', fr: 'Compte utilisateur lié' },
    ],
    disabledActions: [
      { ar: 'إضافة ملف موظف (مخطط)', fr: 'Créer un dossier employé (Planifié)' },
    ],
  },
];

export const EMPLOYEES_HR_INVARIANTS: readonly Record<AppLanguage, string>[] = [
  {
    ar: 'الموظف (Employee) كيان إداري ومهني منفصل عن حساب الدخول التقني (UserAccount) ويمكن ربطه عند الحاجة.',
    fr: 'L’Employé est une entité RH distincte du compte de connexion technique (User ≠ Employee).',
  },
  {
    ar: 'تُربط بيانات الموظف بدليل الأطراف المركزي (Parties) عند إسناد مسؤوليات ميدانية أو مالية.',
    fr: 'Chaque employé peut être rattaché au répertoire central des tiers sans duplication d’identité.',
  },
];
