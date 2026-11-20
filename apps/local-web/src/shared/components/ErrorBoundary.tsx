import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { AppLanguage } from '@/types/erp';
import { getTranslations } from '@/core/localization/translations';

interface ErrorBoundaryProps {
  children: ReactNode;
  language?: AppLanguage;
  /** Optional label used in the console log so the failing surface is identifiable. */
  scope?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

function detectLanguage(fallback?: AppLanguage): AppLanguage {
  if (fallback) return fallback;
  if (typeof document !== 'undefined' && document.documentElement.lang.startsWith('ar')) return 'ar';
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar')) return 'ar';
  return 'ar';
}

/**
 * Last-resort boundary for render-time failures. It deliberately shows no stack trace or error
 * message: those can contain record data. The failure is logged for the local operator console and
 * the user is offered a retry (re-render) or a full reload.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep diagnostics local to the machine; nothing is sent to a remote collector.
    console.error(`[PROMO GEST] UI failure${this.props.scope ? ` in ${this.props.scope}` : ''}`, error, info.componentStack);
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  private readonly handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const language = detectLanguage(this.props.language);
    const t = getTranslations(language);

    return (
      <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold">{t.unexpectedErrorTitle}</h2>
            <p className="mt-1 text-sm leading-6">{t.unexpectedErrorDescription}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t.unexpectedErrorRetry}
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-md bg-amber-900 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-950"
              >
                {t.unexpectedErrorReload}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
