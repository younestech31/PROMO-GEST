const activeModalStack: string[] = [];

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  'details',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

export function registerOpenModal(modalId: string): void {
  const existingIndex = activeModalStack.indexOf(modalId);
  if (existingIndex !== -1) {
    activeModalStack.splice(existingIndex, 1);
  }
  activeModalStack.push(modalId);
}

export function unregisterOpenModal(modalId: string): void {
  const existingIndex = activeModalStack.indexOf(modalId);
  if (existingIndex !== -1) {
    activeModalStack.splice(existingIndex, 1);
  }
}

export function isTopMostModal(modalId: string): boolean {
  return activeModalStack.length > 0 && activeModalStack[activeModalStack.length - 1] === modalId;
}

export function clearModalStackForTests(): void {
  activeModalStack.length = 0;
}

function isFocusableCandidateVisible(element: HTMLElement, container: HTMLElement): boolean {
  if (element.hasAttribute('disabled') || element.hasAttribute('hidden')) {
    return false;
  }
  if (element.getAttribute('aria-hidden') === 'true') {
    return false;
  }
  if (element.closest('[hidden], [aria-hidden="true"], [inert]') !== null) {
    return false;
  }
  const view = element.ownerDocument.defaultView;
  if (view) {
    let current: HTMLElement | null = element;
    while (current) {
      const computed = view.getComputedStyle(current);
      if (computed.display === 'none' || computed.visibility === 'hidden') {
        return false;
      }
      if (current === container) break;
      current = current.parentElement;
    }
  }
  return true;
}

export function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return candidates.filter((element) => {
    const tabIndexAttr = element.getAttribute('tabindex');
    if (tabIndexAttr === '-1') return false;
    return isFocusableCandidateVisible(element, container);
  });
}

export function resolveNextFocusTarget(
  focusables: readonly HTMLElement[],
  activeElement: Element | null,
  shiftKey: boolean,
): HTMLElement | null {
  if (focusables.length === 0) return null;

  const currentIndex = activeElement ? focusables.indexOf(activeElement as HTMLElement) : -1;
  if (shiftKey) {
    if (currentIndex <= 0) {
      return focusables[focusables.length - 1];
    }
    return focusables[currentIndex - 1];
  }

  if (currentIndex === -1 || currentIndex >= focusables.length - 1) {
    return focusables[0];
  }
  return focusables[currentIndex + 1];
}
