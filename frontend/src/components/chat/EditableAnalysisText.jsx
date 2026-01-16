import { useState, useRef, useEffect } from 'react';
import { 
  Edit3, 
  Save, 
  X, 
  RotateCcw,
  History,
  Check,
  AlertCircle
} from 'lucide-react';

/**
 * Componente de texto editável com preview
 * Permite edição inline com confirmação
 */
export default function EditableAnalysisText({ 
  value, 
  onSave, 
  label = 'Texto',
  placeholder = 'Sem conteúdo...',
  maxLength = 5000,
  minHeight = 100,
  disabled = false,
  showCharCount = true
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef(null);

  // Sincronizar com valor externo
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || '');
    }
  }, [value, isEditing]);

  // Verificar se há mudanças
  useEffect(() => {
    setHasChanges(editValue !== (value || ''));
  }, [editValue, value]);

  // Auto-resize do textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(minHeight, textareaRef.current.scrollHeight)}px`;
    }
  }, [editValue, isEditing, minHeight]);

  // Iniciar edição
  const handleStartEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setError(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      // Colocar cursor no final
      textareaRef.current?.setSelectionRange(editValue.length, editValue.length);
    }, 10);
  };

  // Cancelar edição
  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
    setError(null);
  };

  // Salvar edição
  const handleSave = async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setError(err.message || 'Erro ao salvar alterações');
    } finally {
      setIsSaving(false);
    }
  };

  // Reverter para original
  const handleRevert = () => {
    setEditValue(value || '');
  };

  // Atalhos de teclado
  const handleKeyDown = (e) => {
    // Escape cancela
    if (e.key === 'Escape') {
      handleCancel();
    }
    // Ctrl/Cmd + Enter salva
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const charCount = editValue.length;
  const isOverLimit = charCount > maxLength;

  return (
    <div className="group relative">
      {/* Label e ações */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          {label}
          {hasChanges && isEditing && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Não salvo
            </span>
          )}
        </label>

        {!isEditing && !disabled && (
          <button
            onClick={handleStartEdit}
            className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar
          </button>
        )}
      </div>

      {/* Modo de visualização */}
      {!isEditing && (
        <div 
          onClick={handleStartEdit}
          className={`p-4 rounded-xl border transition-all ${
            disabled 
              ? 'bg-slate-50 border-slate-200 cursor-default' 
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer'
          }`}
          style={{ minHeight: `${minHeight}px` }}
        >
          {value ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {value}
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">{placeholder}</p>
          )}
        </div>
      )}

      {/* Modo de edição */}
      {isEditing && (
        <div className="space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`w-full p-4 rounded-xl border-2 transition-all resize-none focus:outline-none ${
                isOverLimit
                  ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200'
                  : 'border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
              }`}
              style={{ minHeight: `${minHeight}px` }}
              disabled={isSaving}
              placeholder={placeholder}
            />

            {/* Indicador de caracteres */}
            {showCharCount && (
              <div className={`absolute bottom-3 right-3 text-xs ${
                isOverLimit ? 'text-red-500 font-semibold' : 'text-slate-400'
              }`}>
                {charCount}/{maxLength}
              </div>
            )}
          </div>

          {/* Erro */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Ações de edição */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving || isOverLimit}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar
                  </>
                )}
              </button>
              
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            </div>

            {hasChanges && (
              <button
                onClick={handleRevert}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Desfazer alterações
              </button>
            )}
          </div>

          {/* Dicas */}
          <p className="text-xs text-slate-400">
            💡 <strong>Ctrl+Enter</strong> para salvar • <strong>Esc</strong> para cancelar
          </p>
        </div>
      )}
    </div>
  );
}
