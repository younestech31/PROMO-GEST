import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { readRequestedViteHost, resolveVitePreviewPolicy } from './apps/local-web/vitePreviewPolicy';

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const value = (name: string) => process.env[name] ?? env[name] ?? '';
  const policy = resolveVitePreviewPolicy({
    command,
    apiUrl: value('ASPNETCORE_URL'),
    viteOnlyPreview: value('PROMOGEST_VITE_ONLY') === '1',
    allowExternalPreview: value('PROMOGEST_VITE_ALLOW_EXTERNAL') === '1',
    allowedHosts: value('PROMOGEST_VITE_ALLOWED_HOSTS'),
    allowedOrigins: value('PROMOGEST_VITE_ALLOWED_ORIGINS'),
    requestedHost: readRequestedViteHost(process.argv),
    staticPreview: process.argv.some((argument) => argument === 'preview'),
  });
  const plugins: any[] = [react(), tailwindcss()];

  if (policy.previewEnabled) {
    const { createPromoGestDevApiPlugin } = await import('./apps/local-web/dev-api-middleware');
    plugins.push(createPromoGestDevApiPlugin({ previewEnabled: true }));
  }

  if (policy.host === '0.0.0.0') {
    console.warn(
      '[PROMO GEST] WARNING: Vite is externally reachable for a temporary development preview. Exact host/origin allowlists are active; also restrict ingress at the Google AI Studio/platform network layer. Never expose this listener directly to a public or production network.'
    );
  }

  return {
    root: path.resolve(__dirname, 'apps/local-web'),
    publicDir: path.resolve(__dirname, 'apps/local-web/public'),
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'apps/local-web/src'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'apps/local-web/dist'),
      emptyOutDir: true,
    },
    server: {
      host: policy.host,
      allowedHosts: policy.allowedHosts,
      cors: policy.allowedOrigins ? { origin: policy.allowedOrigins } : undefined,
      strictPort: true,
      fs: {
        allow: [__dirname],
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: policy.apiTarget
        ? {
            '/api': { target: policy.apiTarget, changeOrigin: false },
            '/health': { target: policy.apiTarget, changeOrigin: false },
          }
        : undefined,
    },
  };
});
