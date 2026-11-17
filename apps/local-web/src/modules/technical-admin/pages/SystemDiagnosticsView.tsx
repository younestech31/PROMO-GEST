import { Database, Lock, Server } from 'lucide-react';
import type { AppLanguage, HealthStatusResponse } from '@/types/erp';
import { formatLocalDateTime } from '@/utils/algerianFormat';
import { PageHeader } from '@/components/PageHeader';

interface SystemDiagnosticsViewProps {
  language: AppLanguage;
  health: HealthStatusResponse | null;
}

export function SystemDiagnosticsView({ language, health }: SystemDiagnosticsViewProps) {
  const isArabic = language === 'ar';

  return (
    <div className="space-y-6">
      <PageHeader
        title={isArabic ? 'التشخيص التقني وحالة النظام' : 'Diagnostics système & infrastructure'}
        subtitle={
          isArabic
            ? 'صفحة إدارية منفصلة عن مساحة العمل اليومية لمتابعة محرك PostgreSQL 18 ووضع تشغيل الخادم.'
            : 'Vue d’administration technique dédiée, séparée de l’espace opérationnel quotidien.'
        }
        language={language}
        moduleCode="A"
        moduleState="IMPLEMENTED_NOT_VERIFIED"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Database className="h-4 w-4 text-teal-800" aria-hidden="true" />
            <span>{isArabic ? 'محرك قاعدة البيانات' : 'Moteur de base de données'}</span>
          </div>
          <div className="text-base font-bold text-slate-900">
            {health?.previewMode
              ? (isArabic ? 'ذاكرة مؤقتة (معاينة الواجهة)' : 'Mémoire temporaire (Aperçu UI)')
              : `PostgreSQL 18${health?.databaseConnected ? ' · OK' : ''}`}
          </div>
          <p className="text-xs text-slate-500">
            {isArabic
              ? 'المرجع الوحيد للبيانات في الإنتاج هو PostgreSQL 18 المحلي على الشبكة الداخلية.'
              : 'En déploiement local-first, PostgreSQL 18 est l’unique source de vérité.'}
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Server className="h-4 w-4 text-teal-800" aria-hidden="true" />
            <span>{isArabic ? 'بيئة خادم التطبيق (.NET 10)' : 'Environnement API (.NET 10)'}</span>
          </div>
          <div className="text-base font-bold font-data text-slate-900">
            {health?.environmentMode ?? '—'}
          </div>
          <p className="text-xs text-slate-500 font-data">
            {health?.timestampUtc
              ? formatLocalDateTime(health.timestampUtc, language)
              : '—'}
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Lock className="h-4 w-4 text-teal-800" aria-hidden="true" />
            <span>{isArabic ? 'حالة التثبيت والأمن' : 'État d’initialisation & sécurité'}</span>
          </div>
          <div className="text-base font-bold text-slate-900">
            {health?.previewMode
              ? (isArabic ? 'وضع المعاينة المؤقتة' : 'Mode aperçu temporaire')
              : health?.isInitialized
                ? (isArabic ? 'مهيأ ومؤمّن (مدير نظام وحيد)' : 'Initialisé et verrouillé')
                : '—'}
          </div>
          <p className="text-xs text-slate-500">
            {isArabic
              ? 'فحص CSRF إجباري، ملفات تعريف ارتباط HTTP-only، وعزل التفويض على مستوى كل مشروع.'
              : 'Validation CSRF obligatoire, cookies HTTP-only et contrôle d’accès par projet.'}
          </p>
        </section>
      </div>
    </div>
  );
}
