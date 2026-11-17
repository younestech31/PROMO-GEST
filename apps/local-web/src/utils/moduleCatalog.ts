/**
 * Compatibility adapter retained while feature screens migrate to core/modules.
 * ERP_MODULE_REGISTRY is the sole source of module metadata and capability states.
 */
export {
  ERP_MODULE_REGISTRY as ERP_MODULE_CATALOG,
  getModuleDefinition,
} from '../core/modules/registry';
export type {
  ErpModuleDefinition,
  ModuleSubScreenDefinition,
  BilingualLabelSpec as BilingualColumnSpec,
} from '../core/modules/registry';
export {
  getModuleStateLabel,
  CANONICAL_MODULE_STATES,
} from '../core/modules/moduleCodes';
export type {
  ModuleCode,
  ModuleImplementationState,
} from '../core/modules/moduleCodes';
