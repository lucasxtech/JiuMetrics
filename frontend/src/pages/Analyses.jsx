// Página de Histórico de Análises Táticas
import { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import AnalysisCard from '../components/analysis/AnalysisCard';
import AiStrategyBox from '../components/analysis/AiStrategyBox';
import ConfirmDeleteModal from '../components/common/ConfirmDeleteModal';
import { getAllAnalyses, deleteAnalysis } from '../services/analysisService';

export default function Analyses() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const contentRef = useRef(null);
  const [filters, setFilters] = useState({
    athleteId: null,
    opponentId: null,
    limit: 20,
    offset: 0
  });

  useEffect(() => {
    loadAnalyses();
  }, [filters]);

  const loadAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllAnalyses(filters);
      // Garantir que sempre seja um array
      setAnalyses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar análises:', err);
      setError('Falha ao carregar análises. Tente novamente.');
      setAnalyses([]); // Garantir array vazio em caso de erro
    } finally {
      setLoading(false);
    }
  };

  const handleView = (analysis) => {
    setSelectedAnalysis(analysis);
    setShowModal(true);
  };

  const handleDelete = (analysisId) => {
    setAnalysisToDelete(analysisId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!analysisToDelete) return;
    
    try {
      await deleteAnalysis(analysisToDelete);
      setAnalyses(prev => prev.filter(a => a.id !== analysisToDelete));
      setAnalysisToDelete(null);
    } catch (err) {
      console.error('Erro ao deletar análise:', err);
      alert('Erro ao deletar análise. Tente novamente.');
      throw err;
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAnalysis(null);
  };

  const handleDownloadPDF = async () => {
    if (!selectedAnalysis) return;

    setIsDownloading(true);
    try {
      const strategyData = selectedAnalysis.strategy_data?.strategy || selectedAnalysis.strategy_data;
      
      console.log('Full strategy data:', strategyData);
      
      // Parsear plano_tatico_faseado se for string
      let planoTatico = strategyData?.plano_tatico_faseado;
      if (typeof planoTatico === 'string') {
        try {
          planoTatico = JSON.parse(planoTatico);
        } catch (e) {
          console.error('Erro ao parsear plano_tatico_faseado:', e);
        }
      }
      
      // Criar conteúdo formatado para PDF
      const content = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
          <h1 style="color: #1f2937; margin-bottom: 10px; font-size: 24px;">
            ${selectedAnalysis.athlete_name} vs ${selectedAnalysis.opponent_name}
          </h1>
          <p style="color: #64748b; margin-bottom: 30px; font-size: 14px;">
            Criado em ${new Date(selectedAnalysis.created_at).toLocaleDateString('pt-BR')}
          </p>
          
          <!-- Tese da Vitória -->
          ${strategyData?.tese_da_vitoria ? `
          <div style="background: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="font-size: 20px;">✓</span>
              <h2 style="color: #475569; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Tese da Vitória</h2>
            </div>
            <p style="color: #0f172a; font-size: 16px; line-height: 1.6; margin: 0;">
              ${strategyData.tese_da_vitoria}
            </p>
          </div>
          ` : ''}
          
          <!-- Análise de Matchup -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #334155; margin-bottom: 15px; font-size: 18px;">Matchup & Assimetrias</h2>
            
            ${strategyData?.analise_de_matchup?.vantagem_critica ? `
            <div style="background: white; border: 1px solid #86efac; border-radius: 6px; padding: 15px; margin-bottom: 15px;">
              <p style="color: #065f46; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">✓ Vantagem Crítica</p>
              <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">
                ${strategyData.analise_de_matchup.vantagem_critica}
              </p>
            </div>
            ` : ''}
            
            ${strategyData?.analise_de_matchup?.neutralizacao ? `
            <div style="background: white; border: 1px solid #fca5a5; border-radius: 6px; padding: 15px;">
              <p style="color: #991b1b; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">⚠ Neutralização</p>
              <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">
                ${strategyData.analise_de_matchup.neutralizacao}
              </p>
            </div>
            ` : ''}
          </div>
          
          <!-- Plano Tático Faseado -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
            <h2 style="color: #334155; margin-bottom: 15px; font-size: 18px;">Plano Tático Faseado</h2>
            
            ${planoTatico?.detalhe_tecnico ? `
            <div style="margin-bottom: 15px;">
              <p style="color: #3b82f6; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">🔍 Detalhe Técnico</p>
              <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">
                ${planoTatico.detalhe_tecnico}
              </p>
            </div>
            ` : ''}
            
            ${planoTatico?.acao_recomendada ? `
            <div style="margin-bottom: 15px;">
              <p style="color: #10b981; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">✓ Ação Recomendada</p>
              <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">
                ${planoTatico.acao_recomendada}
              </p>
            </div>
            ` : ''}
            
            ${planoTatico?.alerta_de_reversao ? `
            <div style="margin-bottom: 15px;">
              <p style="color: #f59e0b; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">⚠️ Alerta de Reversão</p>
              <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">
                ${planoTatico.alerta_de_reversao}
              </p>
            </div>
            ` : ''}
            
            ${planoTatico?.caminho_das_pedras ? `
            <div style="margin-bottom: 15px;">
              <p style="color: #8b5cf6; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">🛣️ Caminho das Pedras</p>
              <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">
                ${planoTatico.caminho_das_pedras}
              </p>
            </div>
            ` : ''}
            
            ${planoTatico?.melhor_posicao ? `
            <div style="margin-bottom: 15px;">
              <p style="color: #06b6d4; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">📍 Melhor Posição</p>
              <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">
                ${planoTatico.melhor_posicao}
              </p>
            </div>
            ` : ''}
            
            ${planoTatico?.gatilho_de_ataque ? `
            <div>
              <p style="color: #dc2626; font-weight: bold; margin: 0 0 8px 0; font-size: 14px;">⚡ Gatilho de Ataque</p>
              <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.6;">
                ${planoTatico.gatilho_de_ataque}
              </p>
            </div>
            ` : ''}
          </div>
        </div>
      `;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      document.body.appendChild(tempDiv);

      const opt = {
        margin: 10,
        filename: `analise-tatica-${selectedAnalysis.athlete_name}-vs-${selectedAnalysis.opponent_name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(tempDiv).save();
      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Filtrar análises baseado no termo de busca
  const filteredAnalyses = analyses.filter((analysis) => {
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase();
    const athleteName = (analysis.athlete_name || '').toLowerCase();
    const opponentName = (analysis.opponent_name || '').toLowerCase();
    
    return athleteName.includes(term) || opponentName.includes(term);
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">Análises Táticas</h1>
        <p className="text-slate-600">
          Histórico de todas as estratégias geradas para seus atletas
        </p>
      </div>

      {/* Campo de Busca */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por atleta ou adversário..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Stats rápidas */}
      {!loading && Array.isArray(analyses) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="panel">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total de Análises</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{analyses.length}</p>
                  {searchTerm && filteredAnalyses.length !== analyses.length && (
                    <p className="text-xs text-blue-600 mt-1">
                      {filteredAnalyses.length} encontrada(s)
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Esta Semana</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {analyses.filter(a => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(a.created_at) > weekAgo;
                    }).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Atletas Únicos</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {new Set(analyses.map(a => a.athlete_id)).size}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">Carregando análises...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="panel bg-red-50 border-red-200">
          <div className="px-6 py-4">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
            <button onClick={loadAnalyses} className="btn-secondary mt-3">
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && analyses.length === 0 && (
        <div className="panel">
          <div className="px-6 py-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhuma análise encontrada
            </h3>
            <p className="text-slate-600 mb-6">
              Gere sua primeira estratégia tática na página de Estratégia
            </p>
            <a href="/strategy" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Criar análise tática
            </a>
          </div>
        </div>
      )}

      {/* Empty State - Busca sem resultados */}
      {!loading && !error && analyses.length > 0 && filteredAnalyses.length === 0 && (
        <div className="panel">
          <div className="px-6 py-12 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Nenhum resultado encontrado
            </h3>
            <p className="text-slate-600 mb-4">
              Não encontramos análises com "{searchTerm}"
            </p>
            <button 
              onClick={() => setSearchTerm('')}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpar busca
            </button>
          </div>
        </div>
      )}

      {/* Lista de Análises */}
      {!loading && !error && Array.isArray(filteredAnalyses) && filteredAnalyses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAnalyses.map((analysis) => (
            <AnalysisCard
              key={analysis.id}
              analysis={analysis}
              onView={handleView}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal de Visualização */}
      {showModal && selectedAnalysis && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* Backdrop clicável */}
          <div className="absolute inset-0" onClick={closeModal} />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedAnalysis.athlete_name} vs {selectedAnalysis.opponent_name}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Criado em {new Date(selectedAnalysis.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="btn-ghost p-2 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteúdo do Modal (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6">
              <AiStrategyBox strategy={selectedAnalysis.strategy_data} />
            </div>

            {/* Footer do Modal */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={closeModal} className="btn-secondary">
                Fechar
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Baixar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setAnalysisToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Excluir Análise Tática"
        message="Deseja remover esta análise tática? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
