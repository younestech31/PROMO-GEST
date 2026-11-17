import type { AppLanguage } from "@/types/erp";
import { PageHeader } from "@/shared/components/PageHeader";
import { PlannedModuleShell } from "@/shared/components/PlannedModuleShell";
import { FINANCE_SUB_WORKFLOWS } from '../presentation/workflows';
import { getModuleDefinition } from "@/core/modules/registry";

interface FinanceModulePageProps {
  projectId: string;
  language: AppLanguage;
}

export function FinanceModulePage({ projectId, language }: FinanceModulePageProps) {
  const isArabic = language === 'ar';
  const def = getModuleDefinition('G');

  return (
    <div className="space-y-6">
      <PageHeader
        title={isArabic ? 'ز. الأقساط والتحصيل والخزينة (دج)' : 'G. Échéances, Encaissements & Trésorerie (DZD)'}
        subtitle={def.summary[language]}
        language={language}
        moduleCode="G"
        moduleState="PLANNED"
      />

      <PlannedModuleShell
        moduleCode="G"
        moduleState="PLANNED"
        title={def.title}
        summary={def.summary}
        scopeNote={def.scopeNote}
        prerequisites={def.prerequisites}
        language={language}
        contextName={`Project #${projectId}`}
        subWorkflows={FINANCE_SUB_WORKFLOWS}
        invariants={[
          {
            ar: 'فصل تام وصارم بين حسابات الضمان المودعة لدى صندوق الضمان FGCMPI وخزينة المرقي العقاري التشغيلية.',
            fr: 'Séparation stricte et obligatoire entre comptes séquestre FGCMPI et trésorerie promoteur.',
          },
        ]}
        plannedEndpoints={[...def.plannedEndpoints]}
      />
    </div>
  );
}
