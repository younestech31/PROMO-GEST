import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { AppLanguage, AuditLogDto, AuthenticatedUser } from '@/types/erp';
import { getTranslations, translateApiError } from '@/core/localization/translations';
import { formatLocalDateTime } from '@/shared/utils/algerianFormat';
import { apiClient, ApiError } from '@/core/api/apiClient';
import { canViewAuditLogs } from '../permissions';

interface AuditLogViewProps {
  language: AppLanguage;
  currentUser: AuthenticatedUser;
}

export function AuditLogView({ language, currentUser }: AuditLogViewProps) {
  const canRead = canViewAuditLogs(currentUser);
  if (!canRead) {
    return <div role="alert">{getTranslations(language).audit.accessDenied}</div>;
  }
  return <AuditLogReader key={`${currentUser.id}:${currentUser.concurrencyStamp}`} language={language} />;
}

function AuditLogReader({ language }: { language: AppLanguage }) {
  const t = getTranslations(language);
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState('');
  const [severity, setSeverity] = useState('');
  const request = useRef<object | null>(null);

  const loadLogs = async () => {
    if (request.current) return;
    const token = {};
    request.current = token;
    setLoading(true);
    setError(null);
    setLogs([]);
    try {
      const data = await apiClient.listAuditLogs(100);
      if (request.current === token) setLogs(data);
    } catch (err) {
      if (request.current === token) setError(err instanceof Error ? err : new Error());
    } finally {
      if (request.current === token) {
        request.current = null;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadLogs();
    return () => { request.current = null; };
  }, []);

  const term = query.trim().toLocaleLowerCase();
  const visibleLogs = logs.filter((log) => (!severity || log.severity === severity) &&
    (!term || [log.actorUsername, log.eventType, log.severity, log.summary, log.ipAddress]
      .some((value) => value?.toLocaleLowerCase().includes(term))));
  // Keep a selected level visible even if the refreshed bounded snapshot no longer contains it.
  const severities = [...new Set([...logs.map((log) => log.severity), ...(severity ? [severity] : [])])].sort();
  const hasFilters = Boolean(query || severity);

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t.audit.title}</h1>
          <p className="text-sm text-slate-600 mt-1">{t.audit.subtitle}</p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadLogs()}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t.audit.refresh}</span>
        </button>
      </div>

      {error !== null && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error instanceof ApiError ? translateApiError(error.code, t.audit.loadError, language) : t.audit.loadError}</p>
          <button type="button" onClick={() => void loadLogs()} className="mt-2 rounded border border-red-300 px-3 py-2 text-xs font-semibold">
            {t.audit.retry}
          </button>
        </div>
      )}

      <p className="text-xs text-slate-500">{t.audit.boundedNotice}</p>
      {!loading && error === null && (logs.length > 0 || hasFilters) && (
        <section aria-label={t.audit.filters} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <label htmlFor="audit-search" className="flex-1 min-w-0 text-xs font-medium text-slate-700">
              <span className="block mb-1">{t.audit.search}</span>
              <input id="audit-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2" />
            </label>
            <label htmlFor="audit-severity" className="text-xs font-medium text-slate-700">
              <span className="block mb-1">{t.audit.tableSeverity}</span>
              <select id="audit-severity" value={severity} onChange={(event) => setSeverity(event.target.value)}
                className="rounded border border-slate-300 px-3 py-2">
                <option value="">{t.audit.allSeverities}</option>
                {severities.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            {hasFilters && <button type="button" onClick={() => { setQuery(''); setSeverity(''); }}
              className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold">{t.audit.clearFilters}</button>}
          </div>
          <p role="status" className="text-xs text-slate-600">{t.audit.resultCount}: <span className="font-data">{visibleLogs.length} / {logs.length}</span></p>
        </section>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div role="status" aria-label={t.audit.loading} aria-busy="true" className="p-8 space-y-3">
            <div className="h-8 bg-slate-100 rounded animate-pulse" />
            <div className="h-8 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : error !== null ? null : logs.length === 0 && !hasFilters ? (
          <div className="p-10 text-center text-sm text-slate-500">{t.audit.emptyTitle}</div>
        ) : visibleLogs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">{t.audit.noMatches}</div>
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
                {visibleLogs.map((log) => (
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
