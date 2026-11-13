import type { AppLanguage } from '../types/erp';

interface LanguageSwitcherProps {
  language: AppLanguage;
  onChange: (lang: AppLanguage) => void;
  variant?: 'light' | 'dark';
}

export function LanguageSwitcher({ language, onChange, variant = 'light' }: LanguageSwitcherProps) {
  const containerClass =
    variant === 'dark'
      ? 'inline-flex items-center rounded-md bg-slate-800 p-0.5 border border-slate-700'
      : 'inline-flex items-center rounded-md bg-slate-100 p-0.5 border border-slate-200';

  const getBtnClass = (active: boolean) => {
    if (variant === 'dark') {
      return active
        ? 'bg-slate-950 text-white shadow-xs'
        : 'text-slate-300 hover:text-white';
    }
    return active
      ? 'bg-white text-slate-900 shadow-xs'
      : 'text-slate-600 hover:text-slate-900';
  };

  return (
    <div className={containerClass} role="group" aria-label="Language switcher">
      <button
        type="button"
        onClick={() => onChange('ar')}
        aria-pressed={language === 'ar'}
        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 ${getBtnClass(
          language === 'ar'
        )}`}
      >
        العربية
      </button>
      <button
        type="button"
        onClick={() => onChange('fr')}
        aria-pressed={language === 'fr'}
        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 ${getBtnClass(
          language === 'fr'
        )}`}
      >
        Français
      </button>
    </div>
  );
}
