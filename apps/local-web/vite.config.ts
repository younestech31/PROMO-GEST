import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  const aspNetCoreUrl = process.env.ASPNETCORE_URL || env.ASPNETCORE_URL;
  const plugins: any[] = [react(), tailwindcss()];

  if (command === 'serve' && !aspNetCoreUrl) {
    const { createPromoGestDevApiPlugin } = await import('./dev-api-middleware');
    plugins.push(createPromoGestDevApiPlugin());
  }

  return {
    root: __dirname,
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
    },
    server: {
      fs: {
        allow: [path.resolve(__dirname, '../..'), __dirname],
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
