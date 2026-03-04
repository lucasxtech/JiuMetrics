import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: '/JiuMetrics/' é usado apenas para deploy no GitHub Pages
  // Para Vercel, usamos '/' (raiz do domínio)
  base: process.env.VERCEL ? '/' : (process.env.NODE_ENV === 'production' ? '/JiuMetrics/' : '/'),
  
  // ✅ Otimizações de build
  build: {
    rollupOptions: {
      output: {
        // Separar vendor bundles (libs externas) para melhor cache
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
    // Comprimir assets com terser
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log em produção
        drop_debugger: true,
      },
    },
    // Aumentar limite de warning de tamanho de chunk
    chunkSizeWarningLimit: 1000,
  },
  
  // ✅ Otimizações de dev server
  server: {
    port: 5173,
    host: true,
    // Cache de dependências para dev mais rápido
    fs: {
      cachedChecks: true,
    },
  },
  
  // ✅ Otimizar pré-bundling de dependências
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
})
