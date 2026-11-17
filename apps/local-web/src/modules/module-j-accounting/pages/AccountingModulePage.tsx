import type { AppLanguage } from "@/types/erp";
import { PageHeader } from "@/shared/components/PageHeader";
import { PlannedModuleShell } from "@/shared/components/PlannedModuleShell";
import { ACCOUNTING_SUB_WORKFLOWS } from '../presentation/workflows';
import { getModuleDefinition } from "@/core/modules/registry";

interface AccountingModulePageProps {
  projectId: string;
  language: AppLanguage;
}

export function AccountingModulePage({ projectId, language }: AccountingModulePageProps) {
  const isArabic = language === 'ar';
  const def = getModuleDefinition('J');

  return (
    <div className="space-y-6">
      <PageHeader
        title={isArabic ? 'ي. المحاسبة (SCF) والجباية الجزائرية' : 'J. Comptabilité SCF & Fiscalité'}
        subtitle={def.summary[language]}
        language={language}
        moduleCode="J"
        moduleState="PLANNED"
      />

      <PlannedModuleShell
        moduleCode="J"
        moduleState="PLANNED"
        title={def.title}
        summary={def.summary}
        scopeNote={def.scopeNote}
        prerequisites={def.prerequisites}
        language={language}
        contextName={`Project #${projectId}`}
        subWorkflows={ACCOUNTING_SUB_WORKFLOWS}
        invariants={[
          {
            ar: 'توازن ثنائي إجباري (المدين = الدائن) في كل قيد محاسبي، مع عدم تضمين أي نسبة ضريبية ثابتة افتراضية بدون اعتماد الخبير المحاسبي (CPA).',
            fr: 'Équilibre strict Débit = Crédit sur chaque écriture, sans taux d’imposition figé sans validation CPA.',
          },
        ]}
        plannedEndpoints={[...def.plannedEndpoints]}
      />
    </div>
  );
}
