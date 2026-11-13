import { RefreshCw, Server, ServerOff } from 'lucide-react';
import type { AppLanguage } from '../types/erp';
import { getTranslations } from '../localization/translations';

export type ServerConnectionState = 'checking' | 'connected' | 'disconnected';

interface ConnectionIndicatorProps {
  state: ServerConnectionState;
  language: AppLanguage;
  onRetry?: () => void;
}

export function ConnectionIndicator({ state, language, onRetry }: ConnectionIndicatorProps) {
  const t = getTranslations(language);

  if (state === 'disconnected') {
    return (
      <div className="inline-flex items-center gap-2 text-xs font-medium text-red-700">
        <ServerOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap">{t.serverDisconnected}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs border border-red-300 rounded hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-red-700"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            <span>{t.retryConnection}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        state === 'connected' ? 'text-emerald-700' : 'text-slate-500'
      }`}
    >
      <Server className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="whitespace-nowrap">
        {state === 'connected' ? t.serverConnected : t.serverChecking}
      </span>
    </div>
  );
}
