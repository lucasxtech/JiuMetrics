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
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { getProfileVersions, restoreProfileVersion } from '../../services/chatService';

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
        ? 'border-blue-300 bg-blue-50/50' 
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
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
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
              className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
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
          {version.content && (
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-500 mb-1">Resumo:</p>
              <p className="text-sm text-slate-700 line-clamp-3 bg-white p-2 rounded border border-slate-200">
                {version.content.substring(0, 200)}...
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
          {version.content && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Resumo Técnico</h4>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                {version.content}
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
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Restaurar esta versão
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Painel de histórico de versões do perfil técnico
 */
export default function ProfileVersionHistoryPanel({ 
  personId, 
  personType, 
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
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await getProfileVersions(personId, personType);
        if (response.success) {
          setVersions(response.data || []);
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

    if (personId) {
      loadVersions();
    }
  }, [personId, personType]);

  // Restaurar versão
  const handleRestore = async (version) => {
    setIsRestoring(true);
    
    try {
      const response = await restoreProfileVersion(personId, personType, version.versionNumber);
      
      if (response.success) {
        // Atualizar lista de versões
        setVersions(prev => prev.map(v => ({
          ...v,
          isCurrent: v.versionNumber === version.versionNumber
        })));
        
        // Notificar componente pai
        if (onVersionRestored) {
          onVersionRestored(response.data.technicalSummary);
        }
        
        // Fechar preview se estiver aberto
        setPreviewVersion(null);
      }
    } catch (err) {
      console.error('Erro ao restaurar versão:', err);
      alert('Erro ao restaurar versão. Tente novamente.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" />
          <span className="font-semibold">Histórico</span>
          {versions.length > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {versions.length} versões
            </span>
          )}
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm">Carregando histórico...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-red-500">
            <AlertCircle className="w-8 h-8 mb-3" />
            <p className="text-sm">{error}</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <History className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhuma versão anterior</p>
            <p className="text-xs text-slate-400 mt-1 text-center">
              As versões aparecem aqui quando você edita o resumo técnico
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <VersionCard
                key={version.id || version.versionNumber}
                version={version}
                isExpanded={expandedId === (version.id || version.versionNumber)}
                onToggle={() => setExpandedId(
                  expandedId === (version.id || version.versionNumber) 
                    ? null 
                    : (version.id || version.versionNumber)
                )}
                onRestore={handleRestore}
                onPreview={setPreviewVersion}
                isRestoring={isRestoring}
              />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
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
