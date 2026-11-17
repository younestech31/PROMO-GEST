import type { AppLanguage } from "@/types/erp";
import { PageHeader } from "@/shared/components/PageHeader";
import { PlannedModuleShell } from "@/shared/components/PlannedModuleShell";
import { CONTRACTS_SUB_WORKFLOWS } from '../presentation/workflows';
import { getModuleDefinition } from "@/core/modules/registry";

interface ContractsModulePageProps {
  projectId: string;
  language: AppLanguage;
  onGoToDocuments: () => void;
}

export function ContractsModulePage({ projectId, language, onGoToDocuments }: ContractsModulePageProps) {
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
            ar: 'المحتوى القانوني والتوثيقي هنا هيكل واجهة أولي فقط، ويظل بانتظار مراجعة واعتماد مختص قانوني وموثق جزائري قبل تحويله إلى قواعد تشغيلية.',
            fr: 'Le contenu juridique et notarial est une structure d’interface provisoire, en attente de validation par un juriste et un notaire algériens avant toute règle opérationnelle.',
          },
        ]}
        plannedEndpoints={[...def.plannedEndpoints]}
        crossLinks={[
          {
            label: { ar: 'فتح وثائق المشروع (K-Min)', fr: 'Ouvrir les documents du projet (K-Min)' },
            onClick: onGoToDocuments,
          },
        ]}
      />
    </div>
  );
}
