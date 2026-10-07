import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: mode === 'demo' ? process.env.VAULT_DEMO_BASE || '/Secure-Vault-Frontend/' : '/',
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist' },
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: { '/api': process.env.VAULT_API_TARGET || 'http://127.0.0.1:8000' },
  },
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.js'], include: ['src/**/*.test.{js,jsx}'] },
}));
