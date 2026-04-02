import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos (dados considerados "frescos")
      cacheTime: 10 * 60 * 1000, // 10 minutos (quanto tempo manter no cache)
      refetchOnWindowFocus: false, // Não buscar ao focar janela
      retry: 1, // Tentar 1x se falhar
    },
  },
});
