// Página de Detalhe do Atleta
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatsBarChart from '../components/charts/StatsBarChart';
import AthleteForm from '../components/forms/AthleteForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import VideoAnalysisCard from '../components/video/VideoAnalysisCard';
import AnalysisDetailModal from '../components/analysis/AnalysisDetailModal';
import ProfileSummaryModal from '../components/analysis/ProfileSummaryModal';
import VideoAnalysisEmptyState from '../components/video/VideoAnalysisEmptyState';
import ConfirmDeleteModal from '../components/common/ConfirmDeleteModal';
import { getAthleteById, deleteAthlete } from '../services/athleteService';
import { getOpponentById, deleteOpponent } from '../services/opponentService';
import { getAnalysesByPerson, deleteAnalysis } from '../services/fightAnalysisService';
import { consolidateProfile } from '../services/aiService';
import { saveProfileSummary } from '../services/chatService';
import { processPersonAnalyses } from '../utils/athleteStats';

export default function AthleteDetail({ isOpponent = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAnalysisModal, setShowDeleteAnalysisModal] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    async function fetchAthlete() {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 AthleteDetail - Carregando dados:', { id, isOpponent });
        
        const response = isOpponent 
          ? await getOpponentById(id)
          : await getAthleteById(id);
        setAthlete(response?.data ?? null);
        
        console.log('✅ Atleta/Adversário carregado:', response?.data?.name);
        
        // Se já tem technicalSummary salvo, carregar automaticamente
        if (response?.data?.technicalSummary) {
          console.log('📋 Resumo técnico salvo encontrado');
          setAiSummary(response.data.technicalSummary);
        }
        
        // Buscar análises do atleta
        try {
          console.log('📊 Buscando análises para person_id:', id);
          const analysesResponse = await getAnalysesByPerson(id);
          console.log('📊 Resposta de análises:', analysesResponse);
          console.log('📊 Total de análises:', analysesResponse?.data?.length || 0);
          setAnalyses(analysesResponse?.data ?? []);
        } catch (analysisErr) {
          console.error('❌ Erro ao carregar análises:', analysisErr);
          console.error('❌ Detalhes do erro:', analysisErr.response?.data);
          setAnalyses([]);
        }
      } catch (err) {
        console.error('❌ Erro ao carregar atleta:', err);
        setError('Não foi possível carregar o atleta.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchAthlete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Função para gerar resumo consolidado com IA (e salvar no perfil)
  const handleGenerateSummary = async () => {
    if (!athlete || !analyses || analyses.length === 0) {
      return;
    }

    try {
      setLoadingSummary(true);
      
      // Usar novo endpoint que consolida e salva no perfil
      const response = await consolidateProfile(
        athlete.id, 
        isOpponent ? 'opponent' : 'athlete'
      );

      if (response.success && response.data?.resumo) {
        setAiSummary(response.data.resumo);
        setShowFullSummary(true); // Expandir automaticamente ao gerar
        
        // Atualizar dados do atleta com o novo resumo
        setAthlete(prev => ({
          ...prev,
          technicalSummary: response.data.resumo,
          technicalSummaryUpdatedAt: response.data.updatedAt
        }));
      }
    } catch (err) {
      console.error('Erro ao gerar resumo com IA:', err);
      alert('Erro ao gerar resumo: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingSummary(false);
    }
  };

  // Função para atualizar resumo técnico via chat de IA ou edição manual
  const handleSummaryUpdated = async (newSummary, editReason = 'Atualização de resumo técnico') => {
    try {
      // Salvar no backend (a API vai criar uma versão automaticamente)
      const response = await saveProfileSummary(
        athlete.id,
        isOpponent ? 'opponent' : 'athlete',
        newSummary,
        editReason
      );

      if (response.success) {
        // Atualizar estado local
        setAiSummary(newSummary);
        setAthlete(prev => ({
          ...prev,
          technicalSummary: newSummary,
          technicalSummaryUpdatedAt: new Date().toISOString()
        }));
      }
    } catch (err) {
      console.error('Erro ao salvar resumo técnico:', err);
      throw err;
    }
  };

  const handleDelete = () => {
    if (!athlete) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (isOpponent) {
        await deleteOpponent(athlete.id);
        navigate('/opponents');
      } else {
        await deleteAthlete(athlete.id);
        navigate('/athletes');
      }
    } catch (err) {
      console.error(`Erro ao deletar ${isOpponent ? 'adversário' : 'atleta'}:`, err);
      setError(`Erro ao deletar ${isOpponent ? 'adversário' : 'atleta'}. Tente novamente.`);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleUpdated = (updatedAthlete) => {
    setAthlete(updatedAthlete);
    setIsEditing(false);
  };

  const handleDeleteAnalysis = (analysisId) => {
    setAnalysisToDelete(analysisId);
    setShowDeleteAnalysisModal(true);
  };

  const confirmDeleteAnalysis = async () => {
    if (!analysisToDelete) return;
    
    try {
      await deleteAnalysis(analysisToDelete);
      setAnalyses(analyses.filter(a => a.id !== analysisToDelete));
      setAnalysisToDelete(null);
    } catch (err) {
      console.error('Erro ao deletar análise:', err);
      setError('Erro ao deletar análise. Tente novamente.');
    }
  };

  const handleViewAnalysisDetails = (analysis) => {
    setSelectedAnalysis(analysis);
    setShowAnalysisModal(true);
  };

  const handleNavigateToVideoAnalysis = () => {
    navigate('/video-analysis');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !athlete) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <ErrorMessage message={error || 'Atleta não encontrado.'} />
        <button
          type="button"
          onClick={() => navigate(isOpponent ? '/opponents' : '/athletes')}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-white shadow-sm hover:bg-slate-700"
        >
          Voltar para {isOpponent ? 'Adversários' : 'Atletas'}
        </button>
      </div>
    );
  }

  // Processar dados das análises após confirmar que athlete existe
  // Usar utilitário centralizado para evitar duplicação de código
  const { attacksData, strongAttacksText, weaknessesText } = 
    processPersonAnalyses(analyses, athlete);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            onClick={() => navigate(isOpponent ? '/opponents' : '/athletes')}
            className="text-secondary hover:text-blue-700 mb-2 flex items-center"
          >
            ← Voltar
          </button>
          <h1 className="text-3xl font-bold text-primary">{athlete.name}</h1>
          <p className="text-gray-600 mt-1">{athlete.belt} • {athlete.style}</p>
        </div>
        <div className="flex gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className={`inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg ${
              isEditing ? 'ring-2 ring-indigo-400' : ''
            }`}
          >
            {isEditing ? 'Cancelar edição' : 'Editar'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-600"
          >
            Deletar
          </button>
        </div>
      </div>

      {/* Resumo Técnico Geral - Gerado pela IA */}
      {analyses.length > 0 && (
        <section className="panel bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Perfil Técnico Completo</h3>
                <p className="text-xs text-indigo-600">
                  {aiSummary ? `Consolidação de ${analyses.length} análise${analyses.length > 1 ? 's' : ''}` : 'Gere um perfil consolidado com IA'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {aiSummary && !loadingSummary && (
                <button
                  onClick={() => setShowFullSummary(!showFullSummary)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-white transition-all"
                >
                  <svg className={`w-4 h-4 transition-transform ${showFullSummary ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {showFullSummary ? 'Fechar' : 'Ver'}
                </button>
              )}
              {!loadingSummary && (
                <button
                  onClick={handleGenerateSummary}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {aiSummary ? 'Regenerar' : 'Gerar com IA'}
                </button>
              )}
              {loadingSummary && (
                <div className="flex items-center gap-2 px-4 py-2 text-indigo-600">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">Gerando...</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Conteúdo expandível */}
          {showFullSummary && aiSummary && (
            <div className="mt-4 pt-4 border-t border-indigo-200">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-indigo-100">
                <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {aiSummary}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {isEditing && (
        <section className="panel">
          <div className="panel__head mb-6">
            <div>
              <p className="eyebrow">Edição</p>
              <h3 className="panel__title">Atualizar dados do atleta</h3>
            </div>
            <p className="panel__meta">Os dados atuais permanecem visíveis abaixo para referência.</p>
          </div>
          <AthleteForm initialData={athlete} onSuccess={handleUpdated} isOpponent={isOpponent} />
        </section>
      )}

      {/* Informações Básicas */}
      <section className={`panel ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="panel__head mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Perfil geral</p>
              <h3 className="panel__title">Resumo técnico</h3>
              <p className="text-sm text-slate-600 mt-1">
                {athlete?.technicalSummary 
                  ? 'Perfil consolidado de todas as análises' 
                  : 'Gerado pela IA baseado na última análise de vídeo'}
              </p>
            </div>
            {/* Botão de Ver detalhes / Editar */}
            {(athlete?.technicalSummary || (analyses.length > 0 && analyses[0]?.summary)) && (
              <button
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver detalhes
              </button>
            )}
          </div>
        </div>
        
        {(athlete?.technicalSummary || (analyses.length > 0 && analyses[0]?.summary)) ? (
          <div 
            className="rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 p-8 shadow-sm cursor-pointer hover:shadow-md transition-all"
            onClick={() => setShowProfileModal(true)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="space-y-6">
                  {(() => {
                    // Usar technicalSummary salvo, ou fallback para análise mais recente
                    const summaryText = athlete?.technicalSummary || analyses[0]?.summary || '';
                    // Dividir o texto em frases
                    const sentences = summaryText.split(/(?<=[.!?])\s+/);
                    const paragraphs = [];
                    
                    // Agrupar frases em parágrafos de 2-3 frases
                    for (let i = 0; i < sentences.length; i += 3) {
                      paragraphs.push(sentences.slice(i, i + 3).join(' '));
                    }
                    
                    return paragraphs.map((paragraph, index) => (
                      <p key={index} className="text-slate-700 leading-relaxed text-[15px]">
                        {paragraph}
                      </p>
                    ));
                  })()}
                </div>
                <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Última atualização: {athlete?.technicalSummaryUpdatedAt 
                      ? new Date(athlete.technicalSummaryUpdatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                      : analyses[0]?.created_at 
                        ? new Date(analyses[0].created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                        : 'N/A'
                    }
                  </div>
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                    Clique para editar
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-amber-900 mb-1">Nenhum resumo disponível</p>
            <p className="text-xs text-amber-700">Analise um vídeo para gerar o resumo técnico com IA</p>
          </div>
        )}
      </section>

      {/* Análises de Vídeo com IA - Nova UI */}
      <section className={`panel ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="panel__head mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Inteligência Artificial</p>
              <h3 className="panel__title">Análises de vídeo ({analyses.length})</h3>
              <p className="text-sm text-slate-600 mt-2">
                Insights gerados por IA a partir de vídeos de lutas
              </p>
            </div>
            {analyses.length > 0 && (
              <button
                onClick={handleNavigateToVideoAnalysis}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl"
              >
                + Nova análise
              </button>
            )}
          </div>
        </div>

        {analyses.length === 0 ? (
          <VideoAnalysisEmptyState onAnalyzeClick={handleNavigateToVideoAnalysis} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analyses.map((analysis) => (
              <VideoAnalysisCard
                key={analysis.id}
                analysis={analysis}
                onDelete={handleDeleteAnalysis}
                onViewDetails={handleViewAnalysisDetails}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal de detalhes da análise */}
      {showAnalysisModal && selectedAnalysis && (
        <AnalysisDetailModal
          analysis={selectedAnalysis}
          onClose={() => {
            setShowAnalysisModal(false);
            setSelectedAnalysis(null);
          }}
          onAnalysisUpdated={(updatedAnalysis) => {
            // Atualizar análise na lista
            setAnalyses(prev => prev.map(a => 
              a.id === updatedAnalysis.id ? updatedAnalysis : a
            ));
            setSelectedAnalysis(updatedAnalysis);
          }}
        />
      )}

      {/* Gráficos */}
      <div className={`grid grid-cols-1 gap-6 ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
        <section className="panel">
          <div className="panel__head mb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Análise ofensiva</p>
                <h3 className="panel__title">Golpes mais utilizados</h3>
              </div>
              {analyses.length > 0 && attacksData.length > 0 && attacksData[0].name !== 'Sem dados' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200">
                  <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-xs font-medium text-purple-700">Dados reais</span>
                </div>
              )}
            </div>
            {analyses.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Técnicas identificadas pela IA nos vídeos
              </p>
            )}
          </div>
          <div className="chart-area">
            <StatsBarChart data={attacksData} />
          </div>
        </section>
      </div>

      {/* Informações Detalhadas */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[{
          title: 'Golpes Fortes',
          description: strongAttacksText,
          hasAI: analyses.length > 0
        }, {
          title: 'Pontos Fracos',
          description: weaknessesText,
          accent: 'text-amber-600',
          hasAI: analyses.length > 0
        }].map((block) => (
          <section
            key={block.title}
            className={`panel ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <div className="panel__head mb-3">
              <div className="flex items-center gap-3">
                <p className="panel__title text-xl">{block.title}</p>
                {block.hasAI && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-xs font-medium text-blue-700">IA</span>
                  </div>
                )}
              </div>
            </div>
            <p className={`text-base text-slate-700 leading-relaxed ${block.accent || ''}`}>
              {block.description || 'Sem registro'}
            </p>
          </section>
        ))}
      </div>

      {/* Vídeos */}
      {athlete.videoUrl && (
        <section className={`panel ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="panel__head mb-4">
            <p className="eyebrow">Referências</p>
            <h3 className="panel__title">Vídeos de referência</h3>
          </div>
          <a
            href={athlete.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-indigo-600 underline decoration-dotted hover:text-indigo-700"
          >
            {athlete.videoUrl}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </section>
      )}

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title={`Excluir ${isOpponent ? 'Adversário' : 'Atleta'}`}
        message={`Essa ação é permanente e removerá todos os dados ${isOpponent ? 'do adversário' : 'do atleta'}. Deseja continuar?`}
        itemName={athlete?.name}
        confirmText={isDeleting ? 'Removendo...' : 'Sim, excluir'}
      />

      <ConfirmDeleteModal
        isOpen={showDeleteAnalysisModal}
        onClose={() => {
          setShowDeleteAnalysisModal(false);
          setAnalysisToDelete(null);
        }}
        onConfirm={confirmDeleteAnalysis}
        title="Excluir Análise"
        message="Deseja remover esta análise? Esta ação não pode ser desfeita."
      />

      {/* Modal de Resumo Técnico com Chat e Histórico de Versões */}
      {showProfileModal && (athlete?.technicalSummary || analyses[0]?.summary) && (
        <ProfileSummaryModal
          person={athlete}
          personType={isOpponent ? 'opponent' : 'athlete'}
          currentSummary={athlete?.technicalSummary || analyses[0]?.summary || ''}
          lastUpdated={athlete?.technicalSummaryUpdatedAt || analyses[0]?.created_at}
          onClose={() => setShowProfileModal(false)}
          onSummaryUpdated={handleSummaryUpdated}
        />
      )}
    </div>
  );
}
