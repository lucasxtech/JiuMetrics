import React from 'react';

/**
 * Componente de loading exibido durante o carregamento lazy de páginas
 * ✅ Otimizado: Menor e mais discreto para melhor UX
 */
export default function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        <p className="mt-3 text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  );
}
