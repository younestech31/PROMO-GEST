import type { AppLanguage } from "@/types/erp";
import { PageHeader } from "@/shared/components/PageHeader";
import { PlannedModuleShell } from "@/shared/components/PlannedModuleShell";
import { CONSTRUCTION_SUB_WORKFLOWS } from '../api/constructionApi';
import { getModuleDefinition } from "@/core/modules/registry";

interface ConstructionModulePageProps {
  projectId: string;
  language: AppLanguage;
}

export function ConstructionModulePage({ projectId, language }: ConstructionModulePageProps) {
  const isArabic = language === 'ar';
  const def = getModuleDefinition('H');

  return (
    <div className="space-y-6">
      <PageHeader
        title={isArabic ? 'ح. الأشغال ومتابعة الورشة' : 'H. Chantier & Suivi des Travaux'}
        subtitle={def.summary[language]}
        language={language}
        moduleCode="H"
        moduleState="PLANNED"
      />

      <PlannedModuleShell
        moduleCode="H"
        moduleState="PLANNED"
        title={def.title}
        summary={def.summary}
        scopeNote={def.scopeNote}
        prerequisites={def.prerequisites}
        language={language}
        contextName={`Project #${projectId}`}
        subWorkflows={CONSTRUCTION_SUB_WORKFLOWS}
        invariants={[
          {
            ar: 'كل إثبات مرحلة إنجاز يفتح قسطاً تعاقدياً لـ VSP يجب أن يُوثّق ويسجل بصمته داخل K-Min.',
            fr: 'Chaque attestation de jalon ouvrant un appel de fonds VSP doit être consignée dans K-Min.',
          },
        ]}
        plannedEndpoints={[...def.plannedEndpoints]}
      />
    </div>
  );
}
