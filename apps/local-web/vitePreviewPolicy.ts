export interface VitePreviewPolicyInput {
  command: 'serve' | 'build';
  apiUrl?: string;
  viteOnlyPreview: boolean;
  allowExternalPreview: boolean;
  allowedHosts?: string;
  allowedOrigins?: string;
  requestedHost?: string;
}

export interface VitePreviewPolicy {
  previewEnabled: boolean;
  apiTarget?: string;
  host: '127.0.0.1' | '0.0.0.0';
  allowedHosts?: string[];
  allowedOrigins?: string[];
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function splitList(value?: string): string[] {
  return (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
}

function isLoopbackHost(value: string): boolean {
  const host = value.trim().toLowerCase();
  return LOOPBACK_HOSTS.has(host) || host === '::ffff:127.0.0.1';
}

function parseAllowedHosts(value?: string): string[] {
  const hosts = splitList(value).map((host) => host.toLowerCase().replace(/\.$/, ''));
  for (const host of hosts) {
    if (
      host === '*' ||
      host.includes('*') ||
      host.length > 253 ||
      !/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|(?:\d{1,3}\.){3}\d{1,3})$/.test(host)
    ) {
      throw new Error('Invalid PROMOGEST_VITE_ALLOWED_HOSTS entry "' + host + '". Use exact host names or IP addresses; wildcards are forbidden.');
    }
  }
  return [...new Set(hosts)];
}

function parseAllowedOrigins(value?: string): string[] {
  const origins = splitList(value);
  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error('Invalid PROMOGEST_VITE_ALLOWED_ORIGINS entry "' + origin + '".');
    }

    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.origin !== origin ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error('Invalid PROMOGEST_VITE_ALLOWED_ORIGINS entry "' + origin + '". Use exact HTTP(S) origins without paths, credentials, query strings or wildcards.');
    }
  }
  return [...new Set(origins)];
}

export function readRequestedViteHost(args: readonly string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--host' || argument === '-H') {
      const next = args[index + 1];
      return next && !next.startsWith('-') ? next : 'true';
    }
    if (argument.startsWith('--host=')) {
      return argument.slice('--host='.length) || 'true';
    }
    if (argument.startsWith('-H') && argument.length > 2) {
      return argument.slice(2);
    }
  }
  return undefined;
}

export function resolveVitePreviewPolicy(input: VitePreviewPolicyInput): VitePreviewPolicy {
  const apiTarget = input.apiUrl?.trim() || undefined;
  const previewEnabled = input.command === 'serve' && input.viteOnlyPreview;

  if (input.command === 'serve' && input.viteOnlyPreview && apiTarget) {
    throw new Error('PROMOGEST_VITE_ONLY=1 cannot be combined with ASPNETCORE_URL. Choose either the explicit in-memory Vite demo or the real ASP.NET Core API.');
  }

  if (input.command === 'serve' && !apiTarget && !input.viteOnlyPreview) {
    throw new Error('Vite dev server is disabled without an API target. Set ASPNETCORE_URL for the real API, or explicitly set PROMOGEST_VITE_ONLY=1 for the disposable in-memory demo.');
  }

  const requestedHost = input.requestedHost?.trim();
  const requestedExternalHost = Boolean(requestedHost && !isLoopbackHost(requestedHost));
  if (requestedExternalHost && !input.allowExternalPreview) {
    throw new Error('External Vite binding "' + requestedHost + '" is blocked. Keep the listener on loopback, or explicitly set PROMOGEST_VITE_ALLOW_EXTERNAL=1 with exact host and origin allowlists.');
  }

  if (input.allowExternalPreview) {
    const hosts = parseAllowedHosts(input.allowedHosts);
    const origins = parseAllowedOrigins(input.allowedOrigins);
    if (hosts.length === 0 || origins.length === 0) {
      throw new Error('External Vite preview requires non-empty PROMOGEST_VITE_ALLOWED_HOSTS and PROMOGEST_VITE_ALLOWED_ORIGINS allowlists.');
    }
    return {
      previewEnabled,
      apiTarget,
      host: '0.0.0.0',
      allowedHosts: hosts,
      allowedOrigins: origins,
    };
  }

  return {
    previewEnabled,
    apiTarget,
    host: '127.0.0.1',
  };
}
