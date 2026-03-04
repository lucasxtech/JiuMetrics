import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';

/**
 * Link inteligente que faz prefetch de componentes lazy ao passar o mouse
 * Isso torna a navegação muito mais rápida, pois começa a carregar a página
 * antes mesmo do usuário clicar
 */
export default function PrefetchLink({ to, prefetchComponent, children, ...props }) {
  const handleMouseEnter = useCallback(() => {
    // Quando usuário passa o mouse, inicia carregamento do componente lazy
    // O componente lazy é uma promise que resolve automaticamente
    if (prefetchComponent) {
      prefetchComponent().catch(() => {
        // Ignora erros de prefetch (não crítico)
      });
    }
  }, [prefetchComponent]);

  return (
    <Link to={to} onMouseEnter={handleMouseEnter} {...props}>
      {children}
    </Link>
  );
}
