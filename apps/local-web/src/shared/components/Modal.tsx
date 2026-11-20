import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import {
  getFocusableElements,
  isTopMostModal,
  registerOpenModal,
  resolveNextFocusTarget,
  unregisterOpenModal,
} from '@/shared/utils/modalFocus';

export interface ModalProps {
  open: boolean;
  titleId: string;
  onClose: () => void;
  closeDisabled?: boolean;
  dir?: 'rtl' | 'ltr';
  overlayClassName?: string;
  panelClassName?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children?: ReactNode;
}

export function Modal({
  open,
  titleId,
  onClose,
  closeDisabled = false,
  dir,
  overlayClassName = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4',
  panelClassName = 'w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-xl outline-none',
  initialFocusRef,
  children,
}: ModalProps) {
  const modalId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);

  onCloseRef.current = onClose;
  closeDisabledRef.current = closeDisabled;

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    registerOpenModal(modalId);

    const panel = panelRef.current;
    const requestedInitial = initialFocusRef?.current;
    if (requestedInitial && panel?.contains(requestedInitial)) {
      requestedInitial.focus();
    } else if (panel) {
      const focusables = getFocusableElements(panel);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        panel.focus();
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopMostModal(modalId)) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!closeDisabledRef.current) {
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;

      const currentPanel = panelRef.current;
      if (!currentPanel) return;

      const focusables = getFocusableElements(currentPanel);
      if (focusables.length === 0) {
        event.preventDefault();
        currentPanel.focus();
        return;
      }

      const active = document.activeElement;
      const isInsidePanel = active !== null && currentPanel.contains(active);
      const atBoundary =
        !isInsidePanel ||
        (event.shiftKey ? active === focusables[0] || active === currentPanel : active === focusables[focusables.length - 1]);

      if (atBoundary) {
        event.preventDefault();
        const nextTarget = resolveNextFocusTarget(
          focusables,
          isInsidePanel && active !== currentPanel ? active : null,
          event.shiftKey,
        );
        nextTarget?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      unregisterOpenModal(modalId);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [open, modalId, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      className={overlayClassName}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      dir={dir}
    >
      <div ref={panelRef} tabIndex={-1} className={panelClassName}>
        {children}
      </div>
    </div>
  );
}
