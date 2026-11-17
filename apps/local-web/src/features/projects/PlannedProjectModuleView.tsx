import type { AppLanguage, ProjectDto } from '../../types/erp';
import { PlannedModuleWorkspace } from '../../components/StateViews';
import type { ModuleCode } from '../../utils/moduleCatalog';

export type PlannedProjectSection =
  | 'contracts'
  | 'finance'
  | 'construction'
  | 'procurement'
  | 'accounting';

const MODULE_META: Record<
  PlannedProjectSection,
  {
    code: ModuleCode;
    columns: Array<{ ar: string; fr: string }>;
  }
> = {
  contracts: {
    code: 'F',
    columns: [
      { ar: 'مرجع العقد', fr: 'Réf. contrat' },
      { ar: 'النظام القانوني', fr: 'Régime légal (FGCMPI / VSP / Acte)' },
      { ar: 'الوحدة', fr: 'Lot' },
      { ar: 'المقتني', fr: 'Acquéreur' },
      { ar: 'المبلغ التعاقدي (دج)', fr: 'Prix contractuel (DZD)' },
      { ar: 'الإصدار / الحالة', fr: 'Version / Statut' },
    ],
  },
  finance: {
    code: 'G',
    columns: [
      { ar: 'الالتزام / القسط', fr: 'Obligation / Échéance' },
      { ar: 'المرحلة (المرسوم 13-431)', fr: 'Palier (Décret 13-431)' },
      { ar: 'تاريخ الاستحقاق', fr: 'Date d’échéance' },
      { ar: 'المستحق (دج)', fr: 'Montant dû (DZD)' },
      { ar: 'المحصّل (دج)', fr: 'Encaissé (DZD)' },
      { ar: 'الحساب (FGCMPI / خزينة)', fr: 'Compte (FGCMPI / Promoteur)' },
    ],
  },
  construction: {
    code: 'H',
    columns: [
      { ar: 'مسار العمل / الحصة', fr: 'Axe / Lot de travaux' },
      { ar: 'المقاول', fr: 'Entreprise' },
      { ar: 'الوضعية / القياس', fr: 'Situation / Attachement' },
      { ar: 'نسبة التقدم المصادق عليها', fr: 'Avancement validé (%)' },
      { ar: 'شاهد المرحلة (K-Min)', fr: 'Preuve de jalon (K-Min)' },
      { ar: 'الحالة', fr: 'Statut' },
    ],
  },
  procurement: {
    code: 'I',
    columns: [
      { ar: 'المرجع (DA / BC / BL)', fr: 'Réf. (DA / BC / BL)' },
      { ar: 'المورد (الطرف المركزي)', fr: 'Fournisseur (Tiers)' },
      { ar: 'المادة / المستودع', fr: 'Article / Dépôt' },
      { ar: 'الكمية المطلوبة / المستلمة', fr: 'Qté commandée / reçue' },
      { ar: 'القيمة (دج)', fr: 'Montant (DZD)' },
      { ar: 'حالة الاعتماد', fr: 'Statut validation' },
    ],
  },
  accounting: {
    code: 'J',
    columns: [
      { ar: 'رقم الحساب (SCF 1-7)', fr: 'Compte SCF (Classes 1-7)' },
      { ar: 'اليومية', fr: 'Journal' },
      { ar: 'القيد والمرجع', fr: 'Écriture & pièce' },
      { ar: 'المدين (دج)', fr: 'Débit (DZD)' },
      { ar: 'الدائن (دج)', fr: 'Crédit (DZD)' },
      { ar: 'الـ TVA / الفترة', fr: 'TVA (9% / 19%) / Période' },
    ],
  },
};

export function PlannedProjectModuleView({
  section,
  project,
  language,
  onGoToDocuments,
}: {
  section: PlannedProjectSection;
  project: ProjectDto;
  language: AppLanguage;
  onGoToDocuments: () => void;
}) {
  const isArabic = language === 'ar';
  const meta = MODULE_META[section];

  return (
    <PlannedModuleWorkspace
      moduleCode={meta.code}
      language={language}
      contextName={`${project.code} · ${isArabic ? project.nameAr : project.nameFr}`}
      extraColumns={meta.columns}
      linkedActionLabel={
        section === 'contracts' || section === 'construction'
          ? (isArabic ? 'الانتقال إلى وثائق المشروع (K-Min)' : 'Ouvrir Documents du projet (K-Min)')
          : undefined
      }
      onLinkedAction={
        section === 'contracts' || section === 'construction' ? onGoToDocuments : undefined
      }
    />
  );
}
