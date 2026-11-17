import type { AppLanguage } from '../../types/erp';

export type ModuleCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';

/**
 * Canonical 6-state module implementation taxonomy aligned with PROMO GEST docs and UI gap matrix.
 */
export type ModuleImplementationState =
  | 'IMPLEMENTED_AND_VERIFIED'
  | 'IMPLEMENTED_NOT_VERIFIED'
  | 'PARTIALLY_IMPLEMENTED'
  | 'PLANNED'
  | 'BLOCKED'
  | 'DEPRECATED';

export const CANONICAL_MODULE_STATES: readonly ModuleImplementationState[] = [
  'IMPLEMENTED_AND_VERIFIED',
  'IMPLEMENTED_NOT_VERIFIED',
  'PARTIALLY_IMPLEMENTED',
  'PLANNED',
  'BLOCKED',
  'DEPRECATED',
] as const;

export const MODULE_STATE_LABELS: Record<ModuleImplementationState, { ar: string; fr: string }> = {
  IMPLEMENTED_AND_VERIFIED: { ar: 'مفعّل ومعتمد', fr: 'Implémenté & vérifié' },
  IMPLEMENTED_NOT_VERIFIED: { ar: 'مفعّل (بانتظار الاعتماد)', fr: 'Implémenté (non vérifié)' },
  PARTIALLY_IMPLEMENTED: { ar: 'مفعّل جزئياً', fr: 'Partiellement implémenté' },
  PLANNED: { ar: 'مخطط / قيد التطوير', fr: 'Planifié / En préparation' },
  BLOCKED: { ar: 'معلّق / بانتظار شرط', fr: 'Bloqué / Prérequis manquant' },
  DEPRECATED: { ar: 'متوقف / ملغى', fr: 'Obsolète / Déprécié' },
};

export function getModuleStateLabel(state: ModuleImplementationState, language: AppLanguage): string {
  return MODULE_STATE_LABELS[state]?.[language] ?? state;
}
