import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // base: '/JiuMetrics/' é usado apenas para deploy no GitHub Pages
  // Em desenvolvimento local, usamos '/'
  base: process.env.NODE_ENV === 'production' ? '/JiuMetrics/' : '/',
})
