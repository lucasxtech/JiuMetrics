// Página de Histórico de Análises Táticas
import { useState, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AnalysisCard from '../components/analysis/AnalysisCard';
import AiStrategyBox from '../components/analysis/AiStrategyBox';
import ConfirmDeleteModal from '../components/common/ConfirmDeleteModal';
import { getAllAnalyses, deleteAnalysis, updateAnalysis } from '../services/analysisService';
import { extractStrategyContent, updateStrategyField, normalizeStrategyStructure } from '../utils/strategyUtils';

// ✅ Lazy load de componentes pesados (só carregam quando usuário aciona)
const StrategyChatPanel = lazy(() => import('../components/chat/StrategyChatPanel'));
const StrategyVersionHistoryPanel = lazy(() => import('../components/analysis/StrategyVersionHistoryPanel'));

export default function Analyses() {
  const queryClient = useQueryClient();
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Estado para edição pendente (diff inline)
  const [pendingEdit, setPendingEdit] = useState(null);
  const [isApplyingEdit, setIsApplyingEdit] = useState(false);
  const [filters] = useState({
    athleteId: null,
    opponentId: null,
    limit: 20,
    offset: 0
  });

  // ✅ React Query: Carregar análises com cache
  const { data: analyses = [], isLoading: loading, error } = useQuery({
    queryKey: ['analyses', filters],
    queryFn: async () => {
      const data = await getAllAnalyses(filters);
      return Array.isArray(data) ? data : [];
    },
  });

  const loadAnalyses = () => {
    // ✅ Recarregar invalidando o cache
    queryClient.invalidateQueries({ queryKey: ['analyses'] });
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
      // ✅ Invalidar cache para recarregar lista atualizada
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
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
    setPendingEdit(null);
    setIsApplyingEdit(false);
    setShowChat(false);
    setShowHistory(false);
  };

  // Handler para quando uma versão é restaurada do histórico
  const handleVersionRestored = (restoredContent) => {
    if (selectedAnalysis) {
      // O restoredContent já é a estrutura completa da estratégia
      // Atualizar diretamente como strategy_data
      setSelectedAnalysis(prev => ({ ...prev, strategy_data: restoredContent }));
      loadAnalyses();
    }
  };

  // Handler para aceitar edição pendente
  const handleAcceptEdit = async () => {
    if (!pendingEdit || !selectedAnalysis) {
      return;
    }

    setIsApplyingEdit(true);
    try {
      const currentStrategyData = selectedAnalysis.strategy_data;
      const currentStrategy = currentStrategyData?.strategy || currentStrategyData;
      
      let updatedStrategy;
      const field = pendingEdit.field;
      const newValue = pendingEdit.newValue;
      
      // Mapear campo para atualização correta
      switch (field) {
        case 'tese_da_vitoria':
        case 'como_vencer':
        case 'strategy': {
          // Atualizar tese_da_vitoria e resumo_rapido.como_vencer
          const teseValue = typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
          updatedStrategy = {
            ...currentStrategyData,
            strategy: {
              ...currentStrategy,
              tese_da_vitoria: teseValue,
              resumo_rapido: {
                ...currentStrategy.resumo_rapido,
                como_vencer: teseValue
              }
            }
          };
          break;
        }
          
        case 'plano_tatico':
        case 'plano_tatico_faseado':
          // Substituir plano_tatico_faseado inteiro
          updatedStrategy = {
            ...currentStrategyData,
            strategy: {
              ...currentStrategy,
              plano_tatico_faseado: typeof newValue === 'object' ? newValue : currentStrategy.plano_tatico_faseado
            }
          };
          break;
          
        case 'cronologia':
        case 'cronologia_inteligente':
          // Substituir cronologia_inteligente inteiro
          updatedStrategy = {
            ...currentStrategyData,
            strategy: {
              ...currentStrategy,
              cronologia_inteligente: typeof newValue === 'object' ? newValue : currentStrategy.cronologia_inteligente
            }
          };
          break;
          
        case 'matchup':
        case 'analise_de_matchup':
          // Substituir analise_de_matchup inteiro
          updatedStrategy = {
            ...currentStrategyData,
            strategy: {
              ...currentStrategy,
              analise_de_matchup: typeof newValue === 'object' ? newValue : currentStrategy.analise_de_matchup
            }
          };
          break;
          
        default:
          // Para outros campos, atualizar diretamente
          updatedStrategy = {
            ...currentStrategyData,
            strategy: {
              ...currentStrategy,
              [field]: newValue
            }
          };
      }
      
    await updateAnalysis(selectedAnalysis.id, { 
      strategy_data: updatedStrategy,
      edited_field: field,
      edited_by: 'ai',
      edit_reason: pendingEdit.reason || 'Sugestão da IA aceita'
    });
      
    setSelectedAnalysis(prev => ({ ...prev, strategy_data: updatedStrategy }));
    loadAnalyses();
    setPendingEdit(null);
    } catch (err) {
      console.error('❌ Erro ao aplicar edição:', err);
      alert('Erro ao aplicar edição. Tente novamente.');
    } finally {
      setIsApplyingEdit(false);
    }
  };

  // Handler para rejeitar edição pendente
  const handleRejectEdit = () => {
    setPendingEdit(null);
  };

  // Handler para quando o chat sugere uma edição
  const handleSuggestEdit = (suggestion) => {
    setPendingEdit(suggestion);
  };

  // Handler para edição manual direta no AiStrategyBox
  const handleManualEdit = async (section, newValue) => {
    if (!selectedAnalysis) return;

    try {
      const currentStrategyData = selectedAnalysis.strategy_data;
      
      // Extrair conteúdo limpo e atualizar campo
      const currentStrategy = extractStrategyContent(currentStrategyData);
      const updatedContent = updateStrategyField(currentStrategy, section, newValue);
      const updatedStrategy = normalizeStrategyStructure(updatedContent);
      
      await updateAnalysis(selectedAnalysis.id, { 
        strategy_data: updatedStrategy,
        edited_field: section,
        edited_by: 'user',
        edit_reason: 'Edição manual'
      });
      
      // Atualizar estado local com os dados limpos
      setSelectedAnalysis(prev => ({ ...prev, strategy_data: updatedStrategy }));
      
      // ✅ Invalidar cache para recarregar lista atualizada
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
    } catch (err) {
      console.error('Erro ao salvar edição manual:', err);
      alert('Erro ao salvar edição. Tente novamente.');
      throw err;
    }
  };

  // Função auxiliar para formatar texto em parágrafos para PDF
  const formatTextToParagraphs = (text) => {
    if (!text) return '';
    
    // Dividir em parágrafos (~200-300 caracteres cada)
    const sentences = text.split(/(?<=\.)\s+/);
    const paragraphs = [];
    let currentParagraph = '';
    
    for (const sentence of sentences) {
      if (currentParagraph && (currentParagraph.length + sentence.length) > 300) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = sentence;
      } else {
        currentParagraph += (currentParagraph ? ' ' : '') + sentence;
      }
    }
    
    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }
    
    // Retornar HTML com parágrafos separados
    return paragraphs.map(p => 
      `<p style="color: #0f172a; font-size: 11px; line-height: 1.6; margin: 0 0 10px 0;">${p}</p>`
    ).join('');
  };

  const handleDownloadPDF = async () => {
    if (!selectedAnalysis) return;

    setIsDownloading(true);
    try {
      // ✅ Lazy import do html2pdf (só carrega quando usuário clica em download)
      const html2pdf = (await import('html2pdf.js')).default;
      
      const strategyData = selectedAnalysis.strategy_data?.strategy || selectedAnalysis.strategy_data;
      
      // Parsear plano_tatico_faseado se for string
      let planoTatico = strategyData?.plano_tatico_faseado;
      if (typeof planoTatico === 'string') {
        try {
          planoTatico = JSON.parse(planoTatico);
        } catch (e) {
          console.error('❌ Erro ao parsear plano_tatico:', e);
        }
      }
      
      // Parsear checklist_tatico se for string
      let checklistTatico = strategyData?.checklist_tatico;
      if (typeof checklistTatico === 'string') {
        try {
          checklistTatico = JSON.parse(checklistTatico);
        } catch (e) {
          console.error('❌ Erro ao parsear checklist:', e);
        }
      }
      
      // Parsear cronologia se for string
      let cronologia = strategyData?.cronologia_inteligente;
      if (typeof cronologia === 'string') {
        try {
          cronologia = JSON.parse(cronologia);
        } catch (e) {
          console.error('❌ Erro ao parsear cronologia:', e);
        }
      }
      
      // Criar conteúdo formatado para PDF
      const content = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
          <h1 style="color: #1f2937; margin-bottom: 10px; font-size: 18px;">
            ${selectedAnalysis.athlete_name} vs ${selectedAnalysis.opponent_name}
          </h1>
          <p style="color: #64748b; margin-bottom: 30px; font-size: 11px;">
            Criado em ${new Date(selectedAnalysis.created_at).toLocaleDateString('pt-BR')}
          </p>
          
          <!-- Como Vencer Esta Luta -->
          ${strategyData?.tese_da_vitoria ? `
          <div style="background: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 8px; padding: 15px; margin-bottom: 20px; page-break-inside: avoid;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="font-size: 14px;">✓</span>
              <h2 style="color: #475569; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Como Vencer Esta Luta</h2>
            </div>
            <div style="color: #0f172a; line-height: 1.6;">
              ${formatTextToParagraphs(strategyData.tese_da_vitoria)}
            </div>
          </div>
          ` : ''}
          
          <!-- Análise de Matchup -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; page-break-inside: avoid;">
            <h2 style="color: #334155; margin-bottom: 15px; font-size: 14px;">Matchup & Assimetrias</h2>
            
            ${strategyData?.analise_de_matchup?.vantagem_critica ? `
            <div style="background: white; border: 1px solid #86efac; border-radius: 6px; padding: 12px; margin-bottom: 15px;">
              <p style="color: #065f46; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">✓ Vantagem Crítica</p>
              <div style="color: #475569; font-size: 10px; line-height: 1.6;">
                ${formatTextToParagraphs(strategyData.analise_de_matchup.vantagem_critica).replace(/font-size: 11px/g, 'font-size: 10px')}
              </div>
            </div>
            ` : ''}
            
            ${strategyData?.analise_de_matchup?.neutralizacao ? `
            <div style="background: white; border: 1px solid #fca5a5; border-radius: 6px; padding: 12px;">
              <p style="color: #991b1b; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">⚠ Neutralização</p>
              <div style="color: #475569; font-size: 10px; line-height: 1.6;">
                ${formatTextToParagraphs(strategyData.analise_de_matchup.neutralizacao).replace(/font-size: 11px/g, 'font-size: 10px')}
              </div>
            </div>
            ` : ''}
          </div>
          
          <!-- Plano Tático Faseado -->
          ${planoTatico ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h2 style="color: #334155; margin-bottom: 15px; font-size: 14px;">🎯 Plano Tático Faseado</h2>
            
            ${planoTatico.em_pe_standup ? `
            <div style="background: white; border-left: 3px solid #3b82f6; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
              <p style="color: #3b82f6; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">🥋 Em Pé (Standup)</p>
              ${Object.entries(planoTatico.em_pe_standup).map(([key, value]) => `
                <div style="margin-bottom: 6px;">
                  <p style="color: #1e40af; font-weight: bold; font-size: 10px; margin: 0 0 2px 0; text-transform: capitalize;">${key.replace(/_/g, ' ')}</p>
                  <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">${value}</p>
                </div>
              `).join('')}
            </div>
            ` : ''}
            
            ${planoTatico.jogo_de_passagem_top ? `
            <div style="background: white; border-left: 3px solid #10b981; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
              <p style="color: #10b981; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">⬇️ Jogo de Passagem (Top)</p>
              ${Object.entries(planoTatico.jogo_de_passagem_top).map(([key, value]) => `
                <div style="margin-bottom: 6px;">
                  <p style="color: #059669; font-weight: bold; font-size: 10px; margin: 0 0 2px 0; text-transform: capitalize;">${key.replace(/_/g, ' ')}</p>
                  <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">${value}</p>
                </div>
              `).join('')}
            </div>
            ` : ''}
            
            ${planoTatico.jogo_de_guarda_bottom ? `
            <div style="background: white; border-left: 3px solid #8b5cf6; padding: 10px; page-break-inside: avoid;">
              <p style="color: #8b5cf6; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">⬆️ Jogo de Guarda (Bottom)</p>
              ${Object.entries(planoTatico.jogo_de_guarda_bottom).map(([key, value]) => `
                <div style="margin-bottom: 6px;">
                  <p style="color: #7c3aed; font-weight: bold; font-size: 10px; margin: 0 0 2px 0; text-transform: capitalize;">${key.replace(/_/g, ' ')}</p>
                  <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">${value}</p>
                </div>
              `).join('')}
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          <!-- Checklist Tático -->
          ${checklistTatico ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px; page-break-inside: avoid;">
            <h2 style="color: #334155; margin: 0 0 12px 0; font-size: 14px; font-weight: bold;">📋 Checklist Tático</h2>
            
            ${checklistTatico.fazer?.length > 0 ? `
            <div style="background: white; border: 1px solid #86efac; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
              <p style="color: #065f46; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">✓ Fazer</p>
              ${checklistTatico.fazer.map(item => `
                <div style="margin-bottom: 4px; padding-left: 8px; border-left: 2px solid #86efac;">
                  <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">• ${item}</p>
                </div>
              `).join('')}
            </div>
            ` : ''}
            
            ${checklistTatico.nao_fazer?.length > 0 ? `
            <div style="background: white; border: 1px solid #fca5a5; border-radius: 6px; padding: 10px; margin-bottom: 12px; page-break-inside: avoid;">
              <p style="color: #991b1b; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">❌ Não Fazer</p>
              ${checklistTatico.nao_fazer.map(item => `
                <div style="margin-bottom: 4px; padding-left: 8px; border-left: 2px solid #fca5a5;">
                  <p style="color: #64748b; font-size: 9px; margin: 0; line-height: 1.4;">• ${item}</p>
                </div>
              `).join('')}
            </div>
            ` : ''}
            
            ${checklistTatico.se_estiver_perdendo ? `
            <div style="background: white; border: 1px solid #fdba74; border-radius: 6px; padding: 10px; page-break-inside: avoid;">
              <p style="color: #c2410c; font-weight: bold; margin: 0 0 6px 0; font-size: 11px;">🔥 Se Estiver Perdendo</p>
              <p style="color: #64748b; font-size: 10px; margin: 0;">${checklistTatico.se_estiver_perdendo}</p>
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          <!-- Cronologia Inteligente -->
          ${cronologia && Object.keys(cronologia).length > 0 ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-top: 15px; page-break-inside: avoid;">
            <h2 style="color: #334155; margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">⏱️ Cronologia Inteligente</h2>
            ${Object.entries(cronologia).map(([fase, conteudo], index) => `
              <div style="background: white; border-left: 3px solid #f59e0b; padding: 8px 10px; margin-bottom: ${index === Object.keys(cronologia).length - 1 ? '0' : '8px'}; page-break-inside: avoid;">
                <p style="color: #d97706; font-weight: bold; margin: 0 0 4px 0; font-size: 10px; text-transform: capitalize;">
                  ${fase.replace(/_/g, ' ')}
                </p>
                <p style="color: #475569; margin: 0; font-size: 10px; line-height: 1.4;">
                  ${conteudo}
                </p>
              </div>
            `).join('')}
          </div>
          ` : ''}
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
    <div className="dashboard-wrapper animate-fadeIn">
      {/* Header Hero */}
      <section className="panel panel--hero flex justify-between items-center">
        <div>
          <p className="eyebrow">Histórico</p>
          <h1 className="hero-title">Análises Táticas</h1>
          <p className="hero-description">Todas as estratégias geradas para seus atletas em um só lugar.</p>
        </div>
        <div className="hero-meta space-y-4">
          <p className="mb-4">Revise estratégias anteriores e acompanhe a evolução dos seus planos de luta.</p>
          <a
            href="/strategy"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-white hover:bg-slate-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
            Nova estratégia
          </a>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <section className="panel py-8! px-6! md:px-8!">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-slate-200 rounded w-full" />
                <div className="h-3 bg-slate-200 rounded w-5/6" />
                <div className="h-8 bg-slate-200 rounded-xl w-full mt-2" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Error State */}
      {error && (
        <section className="panel">
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Erro ao carregar</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <button onClick={loadAnalyses} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-white hover:bg-slate-700">
              Tentar novamente
            </button>
          </div>
        </section>
      )}

      {/* Empty State */}
      {!loading && !error && analyses.length === 0 && (
        <section className="panel text-center">
          <div className="mx-auto max-w-md space-y-6 py-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <h3 className="panel__title mb-2">Nenhuma análise encontrada</h3>
              <p className="text-slate-600">Gere sua primeira estratégia tática para começar a acompanhar o histórico.</p>
            </div>
            <a
              href="/strategy"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-white hover:bg-slate-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
              </svg>
              Criar primeira estratégia
            </a>
          </div>
        </section>
      )}

      {/* Lista de Análises */}
      {!loading && !error && Array.isArray(analyses) && analyses.length > 0 && (
        <section className="panel !py-8 !px-6 md:!px-8">
          <div className="panel__head mb-6">
            <div>
              <p className="eyebrow">Lista</p>
              <h2 className="panel__title">Todas as análises ({analyses.length})</h2>
            </div>
            <span className="panel__meta">Clique em uma análise para ver os detalhes completos.</span>
          </div>

          {/* Campo de Busca */}
          <div className="mb-6">
            <div className="relative max-w-md">
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
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
            {searchTerm && filteredAnalyses.length !== analyses.length && (
              <p className="text-sm text-indigo-600 mt-2">
                {filteredAnalyses.length} resultado(s) encontrado(s)
              </p>
            )}
          </div>

          {/* Empty State - Busca sem resultados */}
          {filteredAnalyses.length === 0 && (
            <div className="text-center py-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum resultado</h3>
              <p className="text-slate-600 mb-4">Não encontramos análises com "{searchTerm}"</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpar busca
              </button>
            </div>
          )}

          {/* Grid de Cards */}
          {filteredAnalyses.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3 xl:gap-10">
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
        </section>
      )}

      {/* Modal de Visualização */}
      {showModal && selectedAnalysis && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* Backdrop clicável */}
          <div className="absolute inset-0" onClick={() => { closeModal(); setShowChat(false); }} />
          
          {/* Container principal com possível painel lateral */}
          <div className="relative flex w-full max-w-7xl max-h-[90vh]">
            {/* Modal Principal */}
            <div className={`relative w-full overflow-y-auto rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
              showChat || showHistory ? 'max-w-4xl' : 'max-w-5xl mx-auto'
            }`}>
              {/* Header do Modal */}
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4 p-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        {selectedAnalysis.athlete_name} vs {selectedAnalysis.opponent_name}
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(selectedAnalysis.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                          Estratégia Tática
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ações do Header */}
                  <div className="flex items-center gap-2">
                    {/* Botão Histórico */}
                    <button
                      onClick={() => { setShowHistory(!showHistory); if (!showHistory) setShowChat(false); }}
                      className={`p-2.5 rounded-lg transition-all flex items-center gap-2 ${
                        showHistory
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50'
                      }`}
                      title="Histórico de Versões"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium hidden sm:inline">Versões</span>
                    </button>

                    {/* Botão Chat IA */}
                    <button
                      onClick={() => { setShowChat(!showChat); if (!showChat) setShowHistory(false); }}
                      className={`p-2.5 rounded-lg transition-all flex items-center gap-2 ${
                        showChat
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                      title="Refinar com IA"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-sm font-medium hidden sm:inline">Chat IA</span>
                    </button>

                    {/* Botão Fechar */}
                    <button
                      onClick={() => { closeModal(); setShowChat(false); }}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Conteúdo da Estratégia */}
              <div className="p-6">
                <AiStrategyBox 
                  strategy={selectedAnalysis.strategy_data} 
                  pendingEdit={pendingEdit}
                  onAcceptEdit={handleAcceptEdit}
                  onRejectEdit={handleRejectEdit}
                  isApplyingEdit={isApplyingEdit}
                  onManualEdit={handleManualEdit}
                />
              </div>

              {/* Footer do Modal */}
              <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50/95 backdrop-blur-sm px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>💡 Use o <strong>Chat IA</strong> para refinar a estratégia de forma inteligente</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => { closeModal(); setShowChat(false); }} 
                      className="px-6 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-all"
                    >
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
            </div>

            {/* Painel Lateral - Chat */}
            {showChat && (
              <div className="w-96 ml-4 flex-shrink-0 animate-fadeIn">
                <Suspense fallback={<div className="text-center py-4"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div></div>}>
                  <StrategyChatPanel
                    strategyData={selectedAnalysis.strategy_data}
                    athleteName={selectedAnalysis.athlete_name}
                    opponentName={selectedAnalysis.opponent_name}
                    onClose={() => setShowChat(false)}
                    pendingEdit={pendingEdit}
                    onSuggestEdit={handleSuggestEdit}
                    onAcceptEdit={handleAcceptEdit}
                    onRejectEdit={handleRejectEdit}
                    isApplyingEdit={isApplyingEdit}
                    onStrategyUpdated={async (updatedStrategy) => {
                      try {
                        await updateAnalysis(selectedAnalysis.id, { strategy_data: updatedStrategy });
                        setSelectedAnalysis(prev => ({ ...prev, strategy_data: updatedStrategy }));
                        loadAnalyses();
                      } catch (err) {
                        console.error('Erro ao atualizar estratégia:', err);
                      }
                    }}
                  />
                </Suspense>
              </div>
            )}

            {/* Painel Lateral - Histórico de Versões */}
            {showHistory && (
              <div className="w-96 ml-4 flex-shrink-0 animate-fadeIn">
                <Suspense fallback={<div className="text-center py-4"><div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div></div>}>
                  <StrategyVersionHistoryPanel
                    analysisId={selectedAnalysis.id}
                    onVersionRestored={handleVersionRestored}
                    onClose={() => setShowHistory(false)}
                  />
                </Suspense>
              </div>
            )}
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
