import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

// ✅ Configurar cache global de dados
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos (dados considerados "frescos")
      cacheTime: 10 * 60 * 1000, // 10 minutos (quanto tempo manter no cache)
      refetchOnWindowFocus: false, // Não buscar ao focar janela
      retry: 1, // Tentar 1x se falhar
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
