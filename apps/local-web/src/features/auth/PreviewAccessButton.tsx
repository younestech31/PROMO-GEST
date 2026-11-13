import { useState } from 'react';
import type { AppLanguage } from '../../types/erp';

interface PreviewAccessButtonProps {
  language: AppLanguage;
  onOpen: () => Promise<void>;
}

/**
 * Explicit opt-in to the disposable in-memory workspace supplied only by the
 * Vite development middleware. Never rendered against the production API.
 */
export function PreviewAccessButton({ language, onOpen }: PreviewAccessButtonProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setIsOpening(true);
    setError(null);
    try {
      await onOpen();
    } catch (err) {
      setError(err instanceof Error ? err.message : (
        language === 'ar' ? 'تعذر فتح المعاينة التجريبية.' : 'Impossible d’ouvrir la démo.'
      ));
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs leading-relaxed text-amber-950">
        {language === 'ar'
          ? 'وضع معاينة تجريبي: مؤسسة ومشاريع افتراضية ببيانات مؤقتة داخل الذاكرة. لا تُدخل بيانات حقيقية؛ تُمسح البيانات عند إعادة تشغيل خادم المعاينة.'
          : 'Mode démo : organisation et projets fictifs conservés en mémoire. N’entrez aucune donnée réelle ; les données sont réinitialisées au redémarrage du serveur de prévisualisation.'}
      </p>
      <button
        type="button"
        onClick={() => void handleOpen()}
        disabled={isOpening}
        className="mt-3 w-full rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
      >
        {isOpening
          ? (language === 'ar' ? 'جارٍ فتح المعاينة…' : 'Ouverture de la démo…')
          : (language === 'ar' ? 'الدخول إلى مساحة المعاينة' : 'Ouvrir l’espace de démonstration')}
      </button>
      {error && (
        <p role="alert" className="mt-2 break-words text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
