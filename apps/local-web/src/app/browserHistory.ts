const APP_HISTORY_INDEX_KEY = '__promoGestHistoryIndex';

export function readAppHistoryIndex(state: unknown): number | null {
  if (!state || typeof state !== 'object') return null;
  const index = (state as Record<string, unknown>)[APP_HISTORY_INDEX_KEY];
  return typeof index === 'number' && Number.isSafeInteger(index) && index >= 0 ? index : null;
}

export function withAppHistoryIndex(state: unknown, index: number): Record<string, unknown> {
  const existingState =
    state && typeof state === 'object' ? (state as Record<string, unknown>) : {};
  return { ...existingState, [APP_HISTORY_INDEX_KEY]: index };
}
