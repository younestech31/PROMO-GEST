import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import type { AppLanguage } from '../../types/erp';

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-9 bg-slate-100 rounded animate-pulse" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
      {icon && <div className="mx-auto mb-3 flex justify-center text-slate-400">{icon}</div>}
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {description && <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-100"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function AccessDeniedState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bg-white border border-rose-200 rounded-lg p-8 text-center space-y-3">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-700">
        <ShieldAlert className="h-5 w-5" aria-hidden="true" />
      </div>
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-600 max-w-md mx-auto">{message}</p>
      {actionLabel && onAction && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onAction}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  saveConfirmLabel?: string;
  savingConfirm?: boolean;
  tone?: 'warning' | 'danger';
  onSaveAndConfirm?: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  saveConfirmLabel,
  savingConfirm = false,
  tone = 'warning',
  onSaveAndConfirm,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingConfirm) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, savingConfirm, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`h-5 w-5 shrink-0 ${tone === 'danger' ? 'text-red-700' : 'text-amber-700'}`}
              aria-hidden="true"
            />
            <h2 id="confirm-dialog-title" className="text-base font-bold text-slate-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            disabled={savingConfirm}
            onClick={onCancel}
            aria-label={cancelLabel}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>

        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={savingConfirm}
            onClick={onCancel}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={savingConfirm}
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
              tone === 'danger' ? 'bg-red-700 hover:bg-red-800' : 'bg-amber-700 hover:bg-amber-800'
            }`}
          >
            {confirmLabel}
          </button>
          {saveConfirmLabel && onSaveAndConfirm && (
            <button
              type="button"
              disabled={savingConfirm}
              onClick={onSaveAndConfirm}
              className="rounded-md bg-teal-800 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-900 disabled:opacity-50"
            >
              {saveConfirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export type LocalizedLabel = Record<AppLanguage, string>;
