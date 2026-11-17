import type { AppLanguage } from "@/types/erp";
import { PageHeader } from "@/shared/components/PageHeader";
import { PlannedModuleShell } from "@/shared/components/PlannedModuleShell";
import { PROCUREMENT_SUB_WORKFLOWS } from '../presentation/workflows';
import { getModuleDefinition } from "@/core/modules/registry";

interface ProcurementModulePageProps {
  projectId: string;
  language: AppLanguage;
}

export function ProcurementModulePage({ projectId, language }: ProcurementModulePageProps) {
  const isArabic = language === 'ar';
  const def = getModuleDefinition('I');

  return (
    <div className="space-y-6">
      <PageHeader
        title={isArabic ? 'ط. المشتريات والموردون والمخزون' : 'I. Achats, Fournisseurs & Stocks'}
        subtitle={def.summary[language]}
        language={language}
        moduleCode="I"
        moduleState="PLANNED"
      />

      <PlannedModuleShell
        moduleCode="I"
        moduleState="PLANNED"
        title={def.title}
        summary={def.summary}
        scopeNote={def.scopeNote}
        prerequisites={def.prerequisites}
        language={language}
        contextName={`Project #${projectId}`}
        subWorkflows={PROCUREMENT_SUB_WORKFLOWS}
        invariants={[
          {
            ar: 'المطابقة الثلاثية الإجبارية بين أمر الشراء (BC) ووصل الاستلام (BL) وفاتورة المورد قبل إذن الصرف.',
            fr: 'Validation obligatoire du contrôle 3 voies (BC / BL / Facture) avant décaissement.',
          },
        ]}
        plannedEndpoints={[...def.plannedEndpoints]}
      />
    </div>
  );
}
