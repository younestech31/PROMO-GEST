export function parseCookieValue(cookieHeader: string, name: string): string | null {
  if (!cookieHeader || !name) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return null;
}

export function isStateChangingMethod(method?: string): boolean {
  const normalized = (method ?? 'GET').trim().toUpperCase();
  return normalized === 'POST' || normalized === 'PUT' || normalized === 'PATCH' || normalized === 'DELETE';
}

export function requiresFreshCsrfToken(url: string): boolean {
  const path = url.split('?')[0];
  return path === '/api/auth/login' || path === '/api/setup/initialize';
}

export interface CsrfRetryCheckInput {
  status: number;
  isMutating: boolean;
  isRetry: boolean;
  isJson: boolean;
  errorCode?: string;
}

export function shouldRetryCsrfError(input: CsrfRetryCheckInput): boolean {
  if (!input.isMutating || input.isRetry || input.status !== 403) {
    return false;
  }
  if (!input.isJson) {
    return true;
  }
  return input.errorCode === 'CSRF_TOKEN_INVALID';
}

