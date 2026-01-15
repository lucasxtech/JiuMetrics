import { useState, useMemo } from 'react';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Calcula as diferenças entre dois textos (algoritmo simplificado)
 * Retorna um array de segmentos com tipo: 'same', 'added', 'removed'
 */
function computeDiff(oldText, newText) {
  if (!oldText && !newText) return [];
  if (!oldText) return [{ type: 'added', text: newText }];
  if (!newText) return [{ type: 'removed', text: oldText }];

  // Dividir em palavras/sentenças para diff mais granular
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);
  
  const result = [];
  let i = 0, j = 0;
  
  // Algoritmo LCS simplificado para encontrar partes comuns
  while (i < oldWords.length || j < newWords.length) {
    if (i >= oldWords.length) {
      // Resto são adições
      result.push({ type: 'added', text: newWords.slice(j).join('') });
      break;
    }
    if (j >= newWords.length) {
      // Resto são remoções
      result.push({ type: 'removed', text: oldWords.slice(i).join('') });
      break;
    }
    
    if (oldWords[i] === newWords[j]) {
      // Palavras iguais
      if (result.length > 0 && result[result.length - 1].type === 'same') {
        result[result.length - 1].text += oldWords[i];
      } else {
        result.push({ type: 'same', text: oldWords[i] });
      }
      i++;
      j++;
    } else {
      // Procurar match futuro
      let foundInOld = -1;
      let foundInNew = -1;
      
      // Procurar palavra nova no texto antigo
      for (let k = i + 1; k < Math.min(i + 10, oldWords.length); k++) {
        if (oldWords[k] === newWords[j]) {
          foundInOld = k;
          break;
        }
      }
      
      // Procurar palavra antiga no texto novo
      for (let k = j + 1; k < Math.min(j + 10, newWords.length); k++) {
        if (newWords[k] === oldWords[i]) {
          foundInNew = k;
          break;
        }
      }
      
      if (foundInNew !== -1 && (foundInOld === -1 || foundInNew - j <= foundInOld - i)) {
        // Adicionar palavras novas
        result.push({ type: 'added', text: newWords.slice(j, foundInNew).join('') });
        j = foundInNew;
      } else if (foundInOld !== -1) {
        // Remover palavras antigas
        result.push({ type: 'removed', text: oldWords.slice(i, foundInOld).join('') });
        i = foundInOld;
      } else {
        // Substituição direta
        result.push({ type: 'removed', text: oldWords[i] });
        result.push({ type: 'added', text: newWords[j] });
        i++;
        j++;
      }
    }
  }
  
  // Mesclar segmentos adjacentes do mesmo tipo
  const merged = [];
  for (const segment of result) {
    if (merged.length > 0 && merged[merged.length - 1].type === segment.type) {
      merged[merged.length - 1].text += segment.text;
    } else if (segment.text) {
      merged.push(segment);
    }
  }
  
  return merged;
}

/**
 * Componente para exibir diferenças entre dois textos
 * Similar ao diff viewer do VS Code
 */
export default function DiffViewer({
  oldValue,
  newValue,
  fieldName,
  reason,
  onAccept,
  onReject,
  isLoading = false,
  hideButtons = false // Nova prop para esconder botões (quando quer mostrar só a visualização)
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState('inline'); // 'inline' ou 'split'
  
  // Calcular diff
  const diffSegments = useMemo(() => {
    const oldText = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue, null, 2);
    const newText = typeof newValue === 'string' ? newValue : JSON.stringify(newValue, null, 2);
    return computeDiff(oldText, newText);
  }, [oldValue, newValue]);

  // Contar mudanças
  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    diffSegments.forEach(seg => {
      if (seg.type === 'added') additions += seg.text.length;
      if (seg.type === 'removed') deletions += seg.text.length;
    });
    return { additions, deletions };
  }, [diffSegments]);

  return (
    <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-100 to-purple-100 border-b border-indigo-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs font-medium text-green-700">+{stats.additions}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs font-medium text-red-700">-{stats.deletions}</span>
          </div>
          {fieldName && (
            <span className="text-xs bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
              {fieldName}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Toggle de modo de visualização */}
          <div className="flex bg-white/50 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('inline')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'inline' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Inline
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                viewMode === 'split' 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Split
            </button>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/50 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Reason/Explanation */}
      {reason && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <p className="text-xs text-amber-800 italic">💡 {reason}</p>
        </div>
      )}

      {/* Diff Content */}
      {isExpanded && (
        <div className="p-4">
          {viewMode === 'inline' ? (
            <InlineDiffView segments={diffSegments} />
          ) : (
            <SplitDiffView oldValue={oldValue} newValue={newValue} />
          )}
        </div>
      )}

      {/* Action Buttons - Opcional */}
      {!hideButtons && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onReject}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
            Rejeitar
          </button>
          <button
            onClick={onAccept}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Aplicando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Aceitar alterações
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Visualização inline das diferenças
 */
function InlineDiffView({ segments }) {
  return (
    <div className="font-mono text-sm leading-relaxed p-3 bg-white rounded-lg border border-slate-200 max-h-64 overflow-y-auto">
      {segments.map((segment, index) => (
        <span
          key={index}
          className={`
            ${segment.type === 'added' ? 'bg-green-100 text-green-800 border-b-2 border-green-400' : ''}
            ${segment.type === 'removed' ? 'bg-red-100 text-red-800 line-through opacity-70' : ''}
            ${segment.type === 'same' ? 'text-slate-700' : ''}
            whitespace-pre-wrap
          `}
        >
          {segment.text}
        </span>
      ))}
    </div>
  );
}

/**
 * Visualização split (lado a lado) das diferenças
 */
function SplitDiffView({ oldValue, newValue }) {
  const oldText = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue, null, 2);
  const newText = typeof newValue === 'string' ? newValue : JSON.stringify(newValue, null, 2);
  
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Lado esquerdo - Antigo */}
      <div className="rounded-lg overflow-hidden border-2 border-red-200">
        <div className="px-3 py-1.5 bg-red-100 border-b border-red-200">
          <span className="text-xs font-semibold text-red-700">Antes</span>
        </div>
        <div className="p-3 bg-red-50/50 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto">
          <p className="text-red-800 whitespace-pre-wrap">{oldText}</p>
        </div>
      </div>
      
      {/* Lado direito - Novo */}
      <div className="rounded-lg overflow-hidden border-2 border-green-200">
        <div className="px-3 py-1.5 bg-green-100 border-b border-green-200">
          <span className="text-xs font-semibold text-green-700">Depois</span>
        </div>
        <div className="p-3 bg-green-50/50 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto">
          <p className="text-green-800 whitespace-pre-wrap">{newText}</p>
        </div>
      </div>
    </div>
  );
}
