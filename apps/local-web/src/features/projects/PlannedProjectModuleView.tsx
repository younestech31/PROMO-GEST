import type { AppLanguage, ProjectDto } from '../../types/erp';
import { PlannedModuleWorkspace } from '../../components/StateViews';
import type { ModuleCode } from '../../utils/moduleCatalog';

export type PlannedProjectSection =
  | 'contracts'
  | 'finance'
  | 'construction'
  | 'procurement'
  | 'accounting';

const MODULE_CODES: Record<PlannedProjectSection, ModuleCode> = {
  contracts: 'F',
  finance: 'G',
  construction: 'H',
  procurement: 'I',
  accounting: 'J',
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
  const moduleCode = MODULE_CODES[section];

  return (
    <PlannedModuleWorkspace
      moduleCode={moduleCode}
      language={language}
      contextName={`${project.code} · ${isArabic ? project.nameAr : project.nameFr}`}
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
