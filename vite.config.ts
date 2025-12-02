import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Essencial para o Electron carregar assets em produção (file://)
  server: {
    port: 3000,
    strictPort: true, // Falha se a porta estiver ocupada em vez de trocar
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
