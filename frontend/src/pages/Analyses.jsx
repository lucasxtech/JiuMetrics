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
      
      console.log('🔍 Full strategy data:', strategyData);
      console.log('🔍 Strategy data keys:', Object.keys(strategyData || {}));
      
      // Parsear plano_tatico_faseado se for string
      let planoTatico = strategyData?.plano_tatico_faseado;
      console.log('🔍 planoTatico inicial:', planoTatico);
      console.log('🔍 planoTatico tipo:', typeof planoTatico);
      
      if (typeof planoTatico === 'string') {
        try {
          planoTatico = JSON.parse(planoTatico);
          console.log('✅ planoTatico parseado:', planoTatico);
        } catch (e) {
          console.error('❌ Erro ao parsear plano_tatico_faseado:', e);
        }
      }
      
      console.log('🔍 planoTatico final:', planoTatico);
      console.log('🔍 planoTatico keys:', planoTatico ? Object.keys(planoTatico) : 'null/undefined');
      
      // Gerar conteúdo HTML para as seções com arrays
      const renderOportunidades = strategyData?.checklist_tatico?.oportunidades_de_pontos 
        ? (Array.isArray(strategyData.checklist_tatico.oportunidades_de_pontos) 
          ? strategyData.checklist_tatico.oportunidades_de_pontos.map(item => {
              if (typeof item === 'string') {
                return `<div style="margin-bottom: 6px; padding-left: 8px;"><span style="color: #10b981; font-weight: bold;">+</span> <span style="color: #475569; font-size: 12px;">${item}</span></div>`;
              } else {
                const probColor = item.probabilidade === 'alta' ? '#10b981' : item.probabilidade === 'media' ? '#f59e0b' : '#64748b';
                return `<div style="margin-bottom: 8px; padding: 6px; background: #f9fafb; border-radius: 4px;">
                  <div style="font-weight: bold; color: #1e293b; font-size: 12px; margin-bottom: 2px;">
                    <span style="color: #10b981;">+</span> ${item.tecnica} (${item.pontos} pontos)
                    <span style="background: ${probColor}20; color: ${probColor}; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-left: 4px;">${item.probabilidade}</span>
                  </div>
                  <div style="color: #64748b; font-size: 11px; padding-left: 12px;">${item.quando}</div>
                </div>`;
              }
            }).join('')
          : `<p style="color: #64748b; font-size: 12px; font-style: italic;">Nenhuma oportunidade identificada</p>`)
        : '';
      
      const renderArmadilhas = strategyData?.checklist_tatico?.armadilhas_dele
        ? (Array.isArray(strategyData.checklist_tatico.armadilhas_dele)
          ? strategyData.checklist_tatico.armadilhas_dele.map(item => {
              if (typeof item === 'string') {
                return `<div style="margin-bottom: 6px; padding-left: 8px;"><span style="color: #dc2626; font-weight: bold;">!</span> <span style="color: #475569; font-size: 12px;">${item}</span></div>`;
              } else {
                return `<div style="margin-bottom: 8px; padding: 6px; background: #fef2f2; border-radius: 4px;">
                  <div style="font-weight: bold; color: #991b1b; font-size: 12px; margin-bottom: 3px;">
                    <span>!</span> ${item.tecnica_perigosa}
                  </div>
                  <div style="color: #64748b; font-size: 11px; margin-bottom: 2px;"><strong>Quando:</strong> ${item.situacao}</div>
                  <div style="color: #64748b; font-size: 11px;"><strong>Como evitar:</strong> ${item.como_evitar}</div>
                </div>`;
              }
            }).join('')
          : `<p style="color: #64748b; font-size: 12px; font-style: italic;">Nenhuma armadilha conhecida</p>`)
        : '';
      
      const renderPlanoEmPe = planoTatico?.em_pe_standup
        ? Object.entries(planoTatico.em_pe_standup).map(([key, value]) => `
            <div style="margin-bottom: 8px;">
              <p style="color: #1e293b; font-weight: 600; margin: 0 0 4px 0; font-size: 12px; text-transform: capitalize;">
                ${key.replace(/_/g, ' ')}:
              </p>
              <p style="color: #475569; margin: 0; font-size: 12px; line-height: 1.4; padding-left: 8px;">
                ${value}
              </p>
            </div>
          `).join('')
        : '';
      
      const renderPlanoPassagem = planoTatico?.jogo_de_passagem_top
        ? Object.entries(planoTatico.jogo_de_passagem_top).map(([key, value]) => `
            <div style="margin-bottom: 8px;">
              <p style="color: #1e293b; font-weight: 600; margin: 0 0 4px 0; font-size: 12px; text-transform: capitalize;">
                ${key.replace(/_/g, ' ')}:
              </p>
              <p style="color: #475569; margin: 0; font-size: 12px; line-height: 1.4; padding-left: 8px;">
                ${value}
              </p>
            </div>
          `).join('')
        : '';
      
      const renderPlanoGuarda = planoTatico?.jogo_de_guarda_bottom
        ? Object.entries(planoTatico.jogo_de_guarda_bottom).map(([key, value]) => `
            <div style="margin-bottom: 8px;">
              <p style="color: #1e293b; font-weight: 600; margin: 0 0 4px 0; font-size: 12px; text-transform: capitalize;">
                ${key.replace(/_/g, ' ')}:
              </p>
              <p style="color: #475569; margin: 0; font-size: 12px; line-height: 1.4; padding-left: 8px;">
                ${value}
              </p>
            </div>
          `).join('')
        : '';
      
      
      // Criar conteúdo formatado para PDF com suporte a quebra de página
      const content = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 100%; width: 750px; box-sizing: border-box;">
          <!-- Header -->
          <div style="margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin-bottom: 8px; font-size: 22px; font-weight: bold;">
              ${selectedAnalysis.athlete_name} vs ${selectedAnalysis.opponent_name}
            </h1>
            <p style="color: #64748b; margin: 0; font-size: 13px;">
              Criado em ${new Date(selectedAnalysis.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <!-- Tese da Vitória -->
          ${strategyData?.tese_da_vitoria ? `
          <div style="background: #f1f5f9; border: 2px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 18px; page-break-inside: avoid;">
            <div style="margin-bottom: 10px;">
              <span style="font-size: 18px; margin-right: 6px;">✓</span>
              <span style="color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold;">Tese da Vitória</span>
            </div>
            <p style="color: #0f172a; font-size: 14px; line-height: 1.5; margin: 0;">
              ${strategyData.tese_da_vitoria}
            </p>
          </div>
          ` : ''}
          
          <!-- Análise de Matchup -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 18px;">
            <h2 style="color: #334155; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">📊 Matchup & Assimetrias</h2>
            
            ${strategyData?.analise_de_matchup?.vantagem_critica ? `
            <div style="background: white; border: 1px solid #86efac; border-radius: 6px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid;">
              <p style="color: #065f46; font-weight: bold; margin: 0 0 6px 0; font-size: 13px;">✓ Vantagem Crítica</p>
              <p style="color: #475569; margin: 0; font-size: 12px; line-height: 1.5;">
                ${strategyData.analise_de_matchup.vantagem_critica}
              </p>
            </div>
            ` : ''}
            
            ${strategyData?.analise_de_matchup?.risco_oculto ? `
            <div style="background: white; border: 1px solid #fca5a5; border-radius: 6px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid;">
              <p style="color: #991b1b; font-weight: bold; margin: 0 0 6px 0; font-size: 13px;">⚠ Risco Oculto</p>
              <p style="color: #475569; margin: 0; font-size: 12px; line-height: 1.5;">
                ${strategyData.analise_de_matchup.risco_oculto}
              </p>
            </div>
            ` : ''}
            
            ${strategyData?.analise_de_matchup?.fator_chave ? `
            <div style="background: white; border: 1px solid #93c5fd; border-radius: 6px; padding: 12px; page-break-inside: avoid;">
              <p style="color: #1e40af; font-weight: bold; margin: 0 0 6px 0; font-size: 13px;">⚡ Fator Chave</p>
              <p style="color: #475569; margin: 0; font-size: 12px; line-height: 1.5;">
                ${strategyData.analise_de_matchup.fator_chave}
              </p>
            </div>
            ` : ''}
          </div>
          
          <!-- Plano Tático Faseado -->
          ${planoTatico && Object.keys(planoTatico).length > 0 ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 18px;">
            <h2 style="color: #334155; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">Plano Tático Faseado</h2>
            
            ${planoTatico.em_pe_standup ? `
            <div style="background: white; border-left: 4px solid #3b82f6; padding: 12px; margin-bottom: 12px; page-break-inside: avoid;">
              <p style="color: #3b82f6; font-weight: bold; margin: 0 0 8px 0; font-size: 13px;">🥋 Em Pé / Standup</p>
              ${renderPlanoEmPe}
            </div>
            ` : ''}
            
            ${planoTatico.jogo_de_passagem_top ? `
            <div style="background: white; border-left: 4px solid #10b981; padding: 12px; margin-bottom: 12px; page-break-inside: avoid;">
              <p style="color: #10b981; font-weight: bold; margin: 0 0 8px 0; font-size: 13px;">⬆️ Jogo de Passagem / Top</p>
              ${renderPlanoPassagem}
            </div>
            ` : ''}
            
            ${planoTatico.jogo_de_guarda_bottom ? `
            <div style="background: white; border-left: 4px solid #8b5cf6; padding: 12px; page-break-inside: avoid;">
              <p style="color: #8b5cf6; font-weight: bold; margin: 0 0 8px 0; font-size: 13px;">⬇️ Jogo de Guarda / Bottom</p>
              ${renderPlanoGuarda}
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          <!-- Checklist Tático -->
          ${strategyData?.checklist_tatico ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 18px;">
            <h2 style="color: #334155; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">✅ Checklist Tático</h2>
            
            ${strategyData.checklist_tatico.oportunidades_de_pontos ? `
            <div style="background: white; border: 1px solid #86efac; border-radius: 6px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid;">
              <p style="color: #065f46; font-weight: bold; margin: 0 0 8px 0; font-size: 13px;">✓ Oportunidades de Pontos</p>
              ${renderOportunidades}
            </div>
            ` : ''}
            
            ${strategyData.checklist_tatico.armadilhas_dele ? `
            <div style="background: white; border: 1px solid #fca5a5; border-radius: 6px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid;">
              <p style="color: #991b1b; font-weight: bold; margin: 0 0 8px 0; font-size: 13px;">⚠ Armadilhas Dele</p>
              ${renderArmadilhas}
            </div>
            ` : ''}
            
            ${strategyData.checklist_tatico.protocolo_de_seguranca ? `
            <div style="background: white; border: 1px solid #fdba74; border-radius: 6px; padding: 12px; page-break-inside: avoid;">
              <p style="color: #c2410c; font-weight: bold; margin: 0 0 8px 0; font-size: 13px;">🛡️ Protocolo de Segurança</p>
              ${strategyData.checklist_tatico.protocolo_de_seguranca.jamais_fazer ? `
              <div style="margin-bottom: 8px; padding: 6px; background: #fef2f2; border-radius: 4px;">
                <p style="color: #991b1b; font-weight: bold; font-size: 11px; margin: 0 0 3px 0;">❌ Jamais Fazer:</p>
                <p style="color: #64748b; font-size: 11px; margin: 0;">${strategyData.checklist_tatico.protocolo_de_seguranca.jamais_fazer}</p>
              </div>
              ` : ''}
              ${strategyData.checklist_tatico.protocolo_de_seguranca.saida_de_emergencia ? `
              <div style="padding: 6px; background: #fef3c7; border-radius: 4px;">
                <p style="color: #92400e; font-weight: bold; font-size: 11px; margin: 0 0 3px 0;">🚪 Saída de Emergência:</p>
                <p style="color: #64748b; font-size: 11px; margin: 0;">${strategyData.checklist_tatico.protocolo_de_seguranca.saida_de_emergencia}</p>
              </div>
              ` : ''}
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          <!-- Cronologia Inteligente -->
          ${strategyData?.cronologia_inteligente ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <h2 style="color: #334155; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">⏱️ Cronologia Inteligente</h2>
            
            ${strategyData.cronologia_inteligente.inicio ? `
            <div style="background: white; border-left: 4px solid #10b981; padding: 12px; margin-bottom: 10px; page-break-inside: avoid;">
              <div style="margin-bottom: 4px;">
                <span style="font-size: 16px;">🟢</span>
                <span style="color: #1e293b; font-weight: bold; font-size: 13px; margin-left: 6px;">Início (0:00 - 1:00)</span>
              </div>
              <p style="color: #475569; margin: 0; font-size: 12px; line-height: 1.5; padding-left: 24px;">
                ${strategyData.cronologia_inteligente.inicio}
              </p>
            </div>
            ` : ''}
            
            ${strategyData.cronologia_inteligente.meio ? `
            <div style="background: white; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 10px; page-break-inside: avoid;">
              <div style="margin-bottom: 4px;">
                <span style="font-size: 16px;">🟡</span>
                <span style="color: #1e293b; font-weight: bold; font-size: 13px; margin-left: 6px;">Meio (2:00 - 4:00)</span>
              </div>
              <p style="color: #475569; margin: 0; font-size: 12px; line-height: 1.5; padding-left: 24px;">
                ${strategyData.cronologia_inteligente.meio}
              </p>
            </div>
            ` : ''}
            
            ${strategyData.cronologia_inteligente.final ? `
            <div style="background: white; border-left: 4px solid #dc2626; padding: 12px; page-break-inside: avoid;">
              <div style="margin-bottom: 4px;">
                <span style="font-size: 16px;">🔴</span>
                <span style="color: #1e293b; font-weight: bold; font-size: 13px; margin-left: 6px;">Final (5:00+)</span>
              </div>
              <p style="color: #475569; margin: 0; font-size: 12px; line-height: 1.5; padding-left: 24px;">
                ${strategyData.cronologia_inteligente.final}
              </p>
            </div>
            ` : ''}
          </div>
          ` : ''}
        </div>
      `;

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      tempDiv.style.width = '800px';
      tempDiv.style.maxWidth = '100%';
      document.body.appendChild(tempDiv);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `analise-tatica-${selectedAnalysis.athlete_name}-vs-${selectedAnalysis.opponent_name}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: 800
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { 
          mode: ['avoid-all', 'css', 'legacy'],
          before: '.page-break-before',
          after: '.page-break-after'
        }
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
                onClick={() => handleDelete(selectedAnalysis.id)}
                className="btn-ghost text-red-600 hover:bg-red-50 p-2"
                style={{ marginLeft: "30vw" }}
                title="Deletar análise"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
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
