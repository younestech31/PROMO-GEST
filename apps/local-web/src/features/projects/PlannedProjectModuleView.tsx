/** @deprecated Planned workflow screens are now owned by their A–J module pages. */
import type { AppLanguage, ProjectDto } from '../../types/erp';
import { ContractsModulePage } from '@/modules/module-f-contracts';
import { FinanceModulePage } from '@/modules/module-g-finance';
import { ConstructionModulePage } from '@/modules/module-h-construction';
import { ProcurementModulePage } from '@/modules/module-i-procurement';
import { AccountingModulePage } from '@/modules/module-j-accounting';

export type PlannedProjectSection =
  | 'contracts'
  | 'finance'
  | 'construction'
  | 'procurement'
  | 'accounting';

interface PlannedProjectModuleViewProps {
  section: PlannedProjectSection;
  project: ProjectDto;
  language: AppLanguage;
  onGoToDocuments: () => void;
}

/** Compatibility dispatcher retained for legacy callers; active routing uses module-owned pages directly. */
export function PlannedProjectModuleView({
  section,
  project,
  language,
  onGoToDocuments,
}: PlannedProjectModuleViewProps) {
  const common = { projectId: project.id, language };

  switch (section) {
    case 'contracts':
      return <ContractsModulePage {...common} onGoToDocuments={onGoToDocuments} />;
    case 'finance':
      return <FinanceModulePage {...common} />;
    case 'construction':
      return <ConstructionModulePage {...common} />;
    case 'procurement':
      return <ProcurementModulePage {...common} />;
    case 'accounting':
      return <AccountingModulePage {...common} />;
    default: {
      const exhaustive: never = section;
      return exhaustive;
    }
  }
}
