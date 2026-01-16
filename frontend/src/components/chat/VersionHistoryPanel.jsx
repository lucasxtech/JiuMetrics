import { useState, useEffect } from 'react';
import { 
  History, 
  Clock, 
  User, 
  Bot, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  Eye,
  X
} from 'lucide-react';
import { getAnalysisVersions, restoreAnalysisVersion } from '../../services/chatService';

/**
 * Card de versão individual
 */
function VersionCard({ version, isExpanded, onToggle, onRestore, onPreview, isRestoring }) {
  const getEditedByIcon = () => {
    if (version.editedBy === 'user') return <User className="w-4 h-4" />;
    return <Bot className="w-4 h-4" />;
  };

  const getEditedByLabel = () => {
    switch (version.editedBy) {
      case 'user': return 'Editado manualmente';
      case 'ai': return 'Sugestão da IA aceita';
      case 'ai_suggestion': return 'Sugestão da IA';
      default: return 'Editado';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${
      version.isCurrent 
        ? 'border-indigo-300 bg-indigo-50/50' 
        : 'border-slate-200 bg-white hover:border-slate-300'
    }`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            version.editedBy === 'user' 
              ? 'bg-blue-100 text-blue-600' 
              : 'bg-purple-100 text-purple-600'
          }`}>
            {getEditedByIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm text-slate-800">
                Versão {version.versionNumber}
              </span>
              {version.isCurrent && (
                <span className="text-xs bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                  Atual
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {formatDate(version.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!version.isCurrent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore(version);
              }}
              disabled={isRestoring}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <div className="border-t border-slate-200 p-3 bg-slate-50">
          <div className="mb-2">
            <span className="text-xs font-medium text-slate-500 uppercase">
              {getEditedByLabel()}
            </span>
            {version.editReason && (
              <p className="text-sm text-slate-600 mt-1 italic">
                "{version.editReason}"
              </p>
            )}
          </div>

          {/* Preview do conteúdo */}
          {version.content?.summary && (
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-500 mb-1">Resumo:</p>
              <p className="text-sm text-slate-700 line-clamp-3 bg-white p-2 rounded border border-slate-200">
                {version.content.summary}
              </p>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview(version);
            }}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver versão completa
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Modal de preview de versão
 */
function VersionPreviewModal({ version, onClose, onRestore, isRestoring }) {
  if (!version) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h3 className="font-semibold text-slate-900">
              Versão {version.versionNumber}
            </h3>
            <p className="text-sm text-slate-500">
              {new Date(version.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {version.content?.summary && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Resumo</h4>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                {version.content.summary}
              </p>
            </div>
          )}

          {version.editReason && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs font-medium text-amber-700 mb-1">Motivo da edição:</p>
              <p className="text-sm text-amber-800">{version.editReason}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
          {!version.isCurrent && (
            <button
              onClick={() => onRestore(version)}
              disabled={isRestoring}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              {isRestoring ? 'Restaurando...' : 'Restaurar esta versão'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Painel de histórico de versões
 */
export default function VersionHistoryPanel({ 
  analysisId, 
  analysisType = 'fight',
  onVersionRestored,
  onClose 
}) {
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Carregar versões
  useEffect(() => {
    const loadVersions = async () => {
      if (!analysisId) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const response = await getAnalysisVersions(analysisId, analysisType);
        if (response.success) {
          setVersions(response.data);
        } else {
          setError(response.error || 'Erro ao carregar versões');
        }
      } catch (err) {
        console.error('Erro ao carregar versões:', err);
        setError('Erro ao carregar histórico de versões');
      } finally {
        setIsLoading(false);
      }
    };

    loadVersions();
  }, [analysisId, analysisType]);

  // Restaurar versão
  const handleRestore = async (version) => {
    setIsRestoring(true);

    try {
      const response = await restoreAnalysisVersion(analysisId, version.versionNumber);
      
      if (response.success) {
        // Atualizar lista de versões
        const updatedVersions = versions.map(v => ({
          ...v,
          isCurrent: v.id === version.id
        }));
        setVersions(updatedVersions);
        setPreviewVersion(null);

        if (onVersionRestored) {
          onVersionRestored(response.data.analysis);
        }
      } else {
        setError(response.error || 'Erro ao restaurar versão');
      }
    } catch (err) {
      console.error('Erro ao restaurar versão:', err);
      setError('Erro ao restaurar versão');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-600" />
          <span className="font-semibold text-slate-800">Histórico de Versões</span>
          {versions.length > 0 && (
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {versions.length} versões
            </span>
          )}
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma versão salva ainda</p>
            <p className="text-xs text-slate-400 mt-1">
              Edições serão salvas automaticamente aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                isExpanded={expandedId === version.id}
                onToggle={() => setExpandedId(expandedId === version.id ? null : version.id)}
                onRestore={handleRestore}
                onPreview={setPreviewVersion}
                isRestoring={isRestoring}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de preview */}
      {previewVersion && (
        <VersionPreviewModal
          version={previewVersion}
          onClose={() => setPreviewVersion(null)}
          onRestore={handleRestore}
          isRestoring={isRestoring}
        />
      )}
    </div>
  );
}
