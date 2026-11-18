import type { AppLanguage, HealthStatusResponse } from '../../types/erp';

export interface DocumentPresentation {
  lang: AppLanguage;
  dir: 'rtl' | 'ltr';
  title: string;
}

export function isVitePreviewRuntime(health: HealthStatusResponse | null): boolean {
  return health?.previewMode === true;
}

export function getDocumentPresentation(language: AppLanguage): DocumentPresentation {
  if (language === 'fr') {
    return {
      lang: 'fr',
      dir: 'ltr',
      title: 'PROMO GEST — ERP Promotion Immobilière',
    };
  }

  return {
    lang: 'ar',
    dir: 'rtl',
    title: 'PROMO GEST — نظام تسيير الترقية العقارية',
  };
}
