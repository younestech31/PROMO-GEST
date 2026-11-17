import type { AppLanguage } from '../../types/erp';
import { getModuleDefinition } from '../../core/modules/registry';
import type { ModuleCode } from '../../core/modules/moduleCodes';
import { PlannedModuleShell } from './PlannedModuleShell';

interface PlannedModuleWorkspaceProps {
  moduleCode: ModuleCode;
  language: AppLanguage;
  contextName?: string;
  initialSubTab?: string;
  extraColumns?: readonly { ar: string; fr: string }[];
  linkedActionLabel?: string;
  onLinkedAction?: () => void;
}

/**
 * Module-aware compatibility composition for planned-workflow screens.
 * Business metadata stays in the canonical module registry; the visual shell
 * receives explicit, normalized presentation props.
 */
export function PlannedModuleWorkspace({
  moduleCode,
  language,
  contextName,
  initialSubTab,
  extraColumns,
  linkedActionLabel,
  onLinkedAction,
}: PlannedModuleWorkspaceProps) {
  const definition = getModuleDefinition(moduleCode);
  const subWorkflows = definition.subScreens.map((screen) => ({
    id: screen.id,
    label: screen.label,
    state: screen.state,
    description: screen.description ?? definition.summary,
    columns: screen.columns?.length ? screen.columns : (extraColumns ?? []),
    disabledActions: screen.disabledActions ?? [],
  }));

  return (
    <PlannedModuleShell
      moduleCode={definition.code}
      moduleState={definition.state}
      title={definition.title}
      summary={definition.summary}
      scopeNote={definition.scopeNote}
      prerequisites={definition.prerequisites}
      plannedEndpoints={definition.plannedEndpoints}
      language={language}
      contextName={contextName}
      initialSubTab={initialSubTab}
      subWorkflows={subWorkflows}
      crossLinks={
        linkedActionLabel && onLinkedAction
          ? [{ label: { ar: linkedActionLabel, fr: linkedActionLabel }, onClick: onLinkedAction }]
          : []
      }
    />
  );
}
