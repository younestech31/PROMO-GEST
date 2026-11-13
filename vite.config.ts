import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const aspNetCoreUrl = process.env.ASPNETCORE_URL || env.ASPNETCORE_URL;
  const plugins: any[] = [react(), tailwindcss()];

  if (command === 'serve' && !aspNetCoreUrl) {
    const { createPromoGestDevApiPlugin } = await import('./apps/local-web/dev-api-middleware');
    plugins.push(createPromoGestDevApiPlugin());
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
      fs: {
        allow: [__dirname],
      },
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: aspNetCoreUrl
        ? {
            '/api': { target: aspNetCoreUrl, changeOrigin: false },
            '/health': { target: aspNetCoreUrl, changeOrigin: false },
          }
        : undefined,
    },
  };
});
