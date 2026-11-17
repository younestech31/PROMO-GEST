import type { AppLanguage } from "@/types/erp";
import { PageHeader } from "@/shared/components/PageHeader";
import { PlannedModuleShell } from "@/shared/components/PlannedModuleShell";
import { CONTRACTS_SUB_WORKFLOWS } from '../api/contractsApi';
import { getModuleDefinition } from "@/core/modules/registry";

interface ContractsModulePageProps {
  projectId: string;
  language: AppLanguage;
}

export function ContractsModulePage({ projectId, language }: ContractsModulePageProps) {
  const isArabic = language === 'ar';
  const def = getModuleDefinition('F');

  return (
    <div className="space-y-6">
      <PageHeader
        title={isArabic ? 'و. العقود والالتزامات التوثيقية' : 'F. Contrats & Actes Notariés'}
        subtitle={def.summary[language]}
        language={language}
        moduleCode="F"
        moduleState="PLANNED"
      />

      <PlannedModuleShell
        moduleCode="F"
        moduleState="PLANNED"
        title={def.title}
        summary={def.summary}
        scopeNote={def.scopeNote}
        prerequisites={def.prerequisites}
        language={language}
        contextName={`Project #${projectId}`}
        subWorkflows={CONTRACTS_SUB_WORKFLOWS}
        invariants={[
          {
            ar: 'لا يُعتد بأي عقد بيع على التصاميم (VSP) دون تقديم شهادة الضمان FGCMPI وتوثيق العقود رسمياً.',
            fr: 'Aucun contrat VSP n’est valide sans attestation FGCMPI et authentification notariale.',
          },
        ]}
        plannedEndpoints={[...def.plannedEndpoints]}
        crossLinks={[
          {
            label: { ar: 'فتح الوثائق (K-Min)', fr: 'Ouvrir Documents (K-Min)' },
            onClick: () => {},
          },
        ]}
      />
    </div>
  );
}
