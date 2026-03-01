import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: '/JiuMetrics/' é usado apenas para deploy no GitHub Pages
  // Para Vercel, usamos '/' (raiz do domínio)
  base: process.env.VERCEL ? '/' : (process.env.NODE_ENV === 'production' ? '/JiuMetrics/' : '/'),
})
