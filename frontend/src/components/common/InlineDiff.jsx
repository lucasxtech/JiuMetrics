import { Check, X } from 'lucide-react';

/**
 * Componente para exibir texto com diff inline
 * Mostra o texto antigo riscado em vermelho e o novo em verde
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
    <div className="relative">
      {/* Container do diff */}
      <div className="relative rounded-lg border-2 border-indigo-300 bg-gradient-to-r from-red-50/50 via-white to-green-50/50 p-3 shadow-lg animate-pulse-soft">
        {/* Indicador de alteração pendente */}
        <div className="absolute -top-3 left-3 px-2 py-0.5 bg-indigo-500 text-white text-xs font-semibold rounded-full shadow">
          ✨ Alteração sugerida
        </div>
        
        {/* Texto antigo */}
        {oldValue && (
          <div className="mb-2 p-2 bg-red-50 rounded-lg border-l-4 border-red-400">
            <p className="text-xs font-semibold text-red-600 mb-1">Antes:</p>
            <p className="text-sm text-red-700 line-through opacity-75 whitespace-pre-wrap">
              {oldValue}
            </p>
          </div>
        )}
        
        {/* Texto novo */}
        <div className="p-2 bg-green-50 rounded-lg border-l-4 border-green-400">
          <p className="text-xs font-semibold text-green-600 mb-1">Depois:</p>
          <p className="text-sm text-green-700 whitespace-pre-wrap font-medium">
            {newValue}
          </p>
        </div>
        
        {/* Botões de ação */}
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-slate-200">
          <button
            onClick={onReject}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            Rejeitar
          </button>
          <button
            onClick={onAccept}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-md disabled:opacity-50"
          >
            {isLoading ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
