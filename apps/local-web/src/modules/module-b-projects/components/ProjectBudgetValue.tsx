import type { AppLanguage } from '../../../types/erp';
import { formatDzd } from '../../../shared/utils/algerianFormat';

/** Use the server-redacted nullable value consistently in both directory layouts. */
export function ProjectBudgetValue({ amount, language }: { amount: number | null; language: AppLanguage }) {
  return <span dir="ltr">{amount === null ? '—' : formatDzd(amount, language)}</span>;
}
