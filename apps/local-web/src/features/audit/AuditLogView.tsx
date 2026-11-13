import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { AppLanguage, AuditLogDto } from '../../types/erp';
import { getTranslations, translateApiError } from '../../localization/translations';
import { formatLocalDateTime } from '../../utils/algerianFormat';
import { apiClient, ApiError } from '../../services/apiClient';

interface AuditLogViewProps {
  language: AppLanguage;
}

export function AuditLogView({ language }: AuditLogViewProps) {
  const t = getTranslations(language);
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.listAuditLogs(100);
      setLogs(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(translateApiError(err.code, err.message, language));
      } else {
        setError(language === 'ar' ? 'تعذر تحميل سجل التدقيق.' : 'Impossible de charger le journal d\'audit.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.audit.title}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.audit.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadLogs()}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.audit.refresh}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            <div className="h-8 bg-slate-100 rounded animate-pulse" />
            <div className="h-8 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">{t.audit.emptyTitle}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="py-3 px-4 text-start">{t.audit.tableTime}</th>
                  <th className="py-3 px-4 text-start">{t.audit.tableActor}</th>
                  <th className="py-3 px-4 text-start">{t.audit.tableEvent}</th>
                  <th className="py-3 px-4 text-start">{t.audit.tableSeverity}</th>
                  <th className="py-3 px-4 text-start">{t.audit.tableSummary}</th>
                  <th className="py-3 px-4 text-end">{t.audit.tableSource}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-data text-slate-600 whitespace-nowrap">
                      {formatLocalDateTime(log.occurredAtUtc, language)}
                    </td>
                    <td className="py-2.5 px-4 font-data text-slate-900">
                      {log.actorUsername ?? '—'}
                    </td>
                    <td className="py-2.5 px-4 font-data font-semibold text-slate-800">
                      {log.eventType}
                    </td>
                    <td className="py-2.5 px-4 font-medium">
                      <span
                        className={
                          log.severity === 'Security'
                            ? 'text-amber-700'
                            : log.severity === 'Warning'
                              ? 'text-red-700'
                              : 'text-slate-600'
                        }
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{log.summary}</td>
                    <td className="py-2.5 px-4 text-end font-data text-slate-500">
                      {log.ipAddress ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
