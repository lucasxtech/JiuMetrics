import { Check, X, Undo2 } from 'lucide-react';

/**
 * Componente de Diff Inline estilo VS Code
 * Mostra a versão antiga (vermelho) e nova (verde) com botões de aceitar/rejeitar
 */
export default function InlineDiff({
  oldValue,
  newValue,
  onAccept,
  onReject,
  isLoading = false
}) {
  if (!newValue || oldValue === newValue) {
    return <span>{oldValue}</span>;
  }

  return (
    <div className="relative font-mono text-sm">
      {/* Linha antiga (removida) - Vermelho */}
      <div className="flex items-start gap-2 bg-red-100 border-l-4 border-red-500 px-3 py-2 rounded-t">
        <span className="flex-shrink-0 text-red-400 font-bold select-none">−</span>
        <span className="text-red-800 line-through whitespace-pre-wrap flex-1">{oldValue}</span>
      </div>
      
      {/* Linha nova (adicionada) - Verde */}
      <div className="flex items-start gap-2 bg-green-100 border-l-4 border-green-500 px-3 py-2 rounded-b">
        <span className="flex-shrink-0 text-green-500 font-bold select-none">+</span>
        <span className="text-green-800 whitespace-pre-wrap flex-1">{newValue}</span>
        
        {/* Botões de ação - estilo VS Code */}
        <div className="flex-shrink-0 flex items-center gap-1 ml-2">
          <button
            onClick={onAccept}
            disabled={isLoading}
            className="p-1.5 rounded bg-green-200 hover:bg-green-300 text-green-700 transition-colors disabled:opacity-50"
            title="Aceitar alteração"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : (
              <Check className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="p-1.5 rounded bg-red-200 hover:bg-red-300 text-red-700 transition-colors disabled:opacity-50"
            title="Rejeitar alteração"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
