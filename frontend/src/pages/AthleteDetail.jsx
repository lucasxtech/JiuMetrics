// Página de Detalhe do Atleta
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatsRadarChart from '../components/charts/StatsRadarChart';
import StatsBarChart from '../components/charts/StatsBarChart';
import AthleteForm from '../components/forms/AthleteForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import VideoAnalysisCard from '../components/VideoAnalysisCard';
import AnalysisDetailModal from '../components/AnalysisDetailModal';
import VideoAnalysisEmptyState from '../components/VideoAnalysisEmptyState';
import { getAthleteById, deleteAthlete } from '../services/athleteService';
import { getOpponentById, deleteOpponent } from '../services/opponentService';
import { getAnalysesByPerson, deleteAnalysis } from '../services/fightAnalysisService';
import { generateAthleteSummary } from '../services/aiService';

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
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    async function fetchAthlete() {
      try {
        setLoading(true);
        setError(null);
        const response = isOpponent 
          ? await getOpponentById(id)
          : await getAthleteById(id);
        setAthlete(response?.data ?? null);
        
        // Buscar análises do atleta
        try {
          const analysesResponse = await getAnalysesByPerson(id);
          setAnalyses(analysesResponse?.data ?? []);
        } catch (analysisErr) {
          console.error('Erro ao carregar análises:', analysisErr);
          setAnalyses([]);
        }
      } catch (err) {
        console.error('Erro ao carregar atleta:', err);
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

  // Função para gerar resumo com IA (sob demanda)
  const handleGenerateSummary = async () => {
    if (!athlete || !analyses || analyses.length === 0) {
      return;
    }

    try {
      setLoadingSummary(true);
        
        // Calcular estatísticas básicas para enviar à IA
        let totalSubmissions = 0;
        let totalSweeps = 0;
        let completedSweeps = 0;
        let totalBackTakes = 0;
        const topTechniquesMap = {};

        analyses.forEach(analysis => {
          const stats = analysis.technical_stats || {};
          totalSubmissions += stats.submissions_attempted || 0;
          totalSweeps += stats.sweeps_attempted || 0;
          completedSweeps += stats.sweeps_completed || 0;
          totalBackTakes += stats.back_takes || 0;

          // Processar charts para técnicas principais
          if (analysis.charts && Array.isArray(analysis.charts)) {
            analysis.charts.forEach(chart => {
              if (chart.data && Array.isArray(chart.data)) {
                chart.data.forEach(item => {
                  if (item.label && item.value > 0) {
                    topTechniquesMap[item.label] = (topTechniquesMap[item.label] || 0) + item.value;
                  }
                });
              }
            });
          }
        });

        const topTechniques = Object.entries(topTechniquesMap)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name]) => name);

        // Calcular atributos básicos
        const condicionamento = Math.min(100, (athlete.cardio || 50) + (analyses.length * 5));
        const tecnica = Math.min(100, Math.max(30, Object.keys(topTechniquesMap).length * 15));
        const agressividade = Math.min(100, (totalSubmissions * 8) + (totalBackTakes * 12));
        const defesa = 60; // Placeholder
        const movimentacao = Math.min(100, 50 + (analyses.length * 8));

        const response = await generateAthleteSummary({
          name: athlete.name,
          belt: athlete.belt,
          weight: athlete.weight,
          style: athlete.style,
          analyses: analyses,
          stats: {
            totalSubmissions,
            totalSweeps,
            completedSweeps,
            totalBackTakes,
            topTechniques,
            attributes: {
              condicionamento,
              tecnica,
              agressividade,
              defesa,
              movimentacao
            }
          }
        });

        if (response.success && response.summary) {
          setAiSummary(response.summary);
        }
      } catch (err) {
        console.error('Erro ao gerar resumo com IA:', err);
        alert('Erro ao gerar resumo: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoadingSummary(false);
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

  const handleDeleteAnalysis = async (analysisId) => {
    if (confirm('Deseja remover esta análise?')) {
      try {
        await deleteAnalysis(analysisId);
        setAnalyses(analyses.filter(a => a.id !== analysisId));
      } catch (err) {
        console.error('Erro ao deletar análise:', err);
        setError('Erro ao deletar análise. Tente novamente.');
      }
    }
  };

  const handleViewAnalysisDetails = (analysis) => {
    setSelectedAnalysis(analysis);
    setShowAnalysisModal(true);
  };

  const handleNavigateToVideoAnalysis = () => {
    navigate('/video-analysis');
  };

  // Processar dados das análises para gerar métricas dinâmicas
  const processAnalysesData = () => {
    if (!analyses || analyses.length === 0 || !athlete) {
      return {
        radarData: [
          { name: 'Condicionamento', value: athlete?.cardio || 50 },
          { name: 'Técnica', value: 50 },
          { name: 'Agressividade', value: 50 },
          { name: 'Defesa', value: 50 },
          { name: 'Movimentação', value: 50 },
        ],
        attacksData: [
          { name: 'Sem dados', value: 0 },
        ],
        stats: {}
      };
    }

    // Variáveis para acumular dados
    const techniquesMap = {};
    let totalSweeps = 0;
    let totalSubmissions = 0;
    let totalBackTakes = 0;
    let completedSweeps = 0;
    let totalActions = 0;
    let totalPositions = 0;

    analyses.forEach((analysis) => {
      // Processar technical_stats
      const stats = analysis.technical_stats || {};
      
      if (stats.sweeps?.quantidade) {
        totalSweeps += stats.sweeps.quantidade;
        completedSweeps += stats.sweeps.concluidas || 0;
        totalActions += stats.sweeps.quantidade;
      }
      
      if (stats.submissions?.tentativas) {
        totalSubmissions += stats.submissions.tentativas;
        totalActions += stats.submissions.tentativas;
      }
      
      if (stats.back_takes?.quantidade) {
        totalBackTakes += stats.back_takes.quantidade;
        totalActions += stats.back_takes.quantidade;
      }

      // Processar CHARTS - principal fonte de dados
      if (analysis.charts && Array.isArray(analysis.charts)) {
        analysis.charts.forEach((chart) => {
          const data = chart.data || [];

          data.forEach(item => {
            const label = (item.label || '').toLowerCase();
            const value = parseFloat(item.value) || 0;

            if (value > 0) {
              totalPositions += value;

              // Adicionar ao mapa de técnicas para o gráfico de barras
              const techniqueName = item.label || 'Desconhecido';
              
              // Categorizar e acumular
              if (label.includes('raspagem') || label.includes('sweep')) {
                techniquesMap['Raspagens'] = (techniquesMap['Raspagens'] || 0) + value;
                totalActions += value;
              } else if (label.includes('finalização') || label.includes('finaliza') || 
                         label.includes('submission') || label.includes('armlock') || 
                         label.includes('kimura') || label.includes('triangulo') ||
                         label.includes('estrangulamento')) {
                techniquesMap['Finalizações'] = (techniquesMap['Finalizações'] || 0) + value;
                totalActions += value;
              } else if (label.includes('passagem') || label.includes('pass')) {
                techniquesMap['Passagens de Guarda'] = (techniquesMap['Passagens de Guarda'] || 0) + value;
                totalActions += value;
              } else if (label.includes('costas') || label.includes('back')) {
                techniquesMap['Pegadas de Costas'] = (techniquesMap['Pegadas de Costas'] || 0) + value;
                totalActions += value;
              } else if (label.includes('guarda')) {
                // Tipos de guarda específicos
                if (!label.includes('passagem') && !label.includes('tempo')) {
                  techniquesMap[techniqueName] = (techniquesMap[techniqueName] || 0) + value;
                }
              } else if (label.includes('defesa') || label.includes('escape')) {
                techniquesMap['Defesas/Escapes'] = (techniquesMap['Defesas/Escapes'] || 0) + value;
                totalActions += value;
              } else if (value >= 5) {
                // Outras técnicas com valores significativos
                techniquesMap[techniqueName] = (techniquesMap[techniqueName] || 0) + value;
              }
            }
          });
        });
      }
    });

    // CÁLCULO DOS ATRIBUTOS - ajustado para dados reais
    
    // 1. CONDICIONAMENTO - baseado em volume total de ações
    const condicionamento = athlete.cardio || 
      Math.min(100, Math.max(30, (totalActions * 2) + (totalPositions * 0.5)));

    // 2. TÉCNICA - variedade e volume de técnicas
    const techniqueVariety = Object.keys(techniquesMap).length;
    const totalTechniqueVolume = Object.values(techniquesMap).reduce((sum, val) => sum + val, 0);
    const tecnica = Math.min(100, Math.max(20, 
      (techniqueVariety * 10) + (totalTechniqueVolume * 1.5)
    ));

    // 3. AGRESSIVIDADE - finalizações e ações ofensivas
    const agressividade = Math.min(100, Math.max(15,
      (totalSubmissions * 12) + 
      (totalSweeps * 4) + 
      (totalBackTakes * 8)
    ));

    // 4. DEFESA - taxa de sucesso e ações defensivas
    const sweepSuccessRate = totalSweeps > 0 ? (completedSweeps / totalSweeps) : 0;
    const defensiveValue = (techniquesMap['Defesas/Escapes'] || 0);
    const defesa = Math.min(100, Math.max(10,
      (sweepSuccessRate * 50) + (defensiveValue * 3)
    ));

    // 5. MOVIMENTAÇÃO - mudanças de posição e transições
    const movimentacao = Math.min(100, Math.max(15,
      (totalBackTakes * 12) + 
      (totalSweeps * 6) + 
      (techniqueVariety * 5)
    ));

    const radarData = [
      { name: 'Condicionamento', value: Math.round(condicionamento) },
      { name: 'Técnica', value: Math.round(tecnica) },
      { name: 'Agressividade', value: Math.round(agressividade) },
      { name: 'Defesa', value: Math.round(defesa) },
      { name: 'Movimentação', value: Math.round(movimentacao) },
    ];

    // Converter técnicas para array e ordenar
    const attacksData = Object.entries(techniquesMap)
      .map(([name, value]) => ({ 
        name: name.charAt(0).toUpperCase() + name.slice(1), 
        value: Math.round(value)
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 técnicas

    // Gerar insights de Golpes Fortes e Pontos Fracos
    const strongAttacks = [];
    const weaknesses = [];

    // Identificar golpes fortes (técnicas mais usadas com sucesso)
    if (totalSubmissions > 5) {
      strongAttacks.push(`Finalização (${totalSubmissions} tentativas)`);
    }
    if (totalSweeps > 8) {
      strongAttacks.push(`Raspagens (${totalSweeps} execuções)`);
    }
    if (totalBackTakes > 3) {
      strongAttacks.push(`Pegadas de costas (${totalBackTakes} vezes)`);
    }
    
    // Adicionar técnicas específicas do topo
    attacksData.slice(0, 3).forEach(tech => {
      if (tech.value > 10 && !strongAttacks.some(s => s.includes(tech.name))) {
        strongAttacks.push(`${tech.name} (${tech.value})`);
      }
    });

    // Identificar pontos fracos baseados em baixa taxa de sucesso
    if (totalSweeps > 0 && completedSweeps / totalSweeps < 0.5) {
      weaknesses.push('Taxa de conclusão de raspagens abaixo de 50%');
    }
    if (totalSubmissions > 0 && totalSubmissions < 3) {
      weaknesses.push('Poucas tentativas de finalização');
    }
    if (totalBackTakes === 0 && totalSweeps > 5) {
      weaknesses.push('Não demonstrou pegadas de costas nos vídeos');
    }
    if (techniqueVariety < 3) {
      weaknesses.push('Pouca variedade técnica observada');
    }
    if (defensiveValue === 0) {
      weaknesses.push('Poucas ações defensivas/escapes identificadas');
    }

    const strongAttacksText = strongAttacks.length > 0 
      ? strongAttacks.join(', ')
      : athlete.strongAttacks || 'Aguardando mais análises para identificar padrões';

    const weaknessesText = weaknesses.length > 0
      ? weaknesses.join('. ')
      : athlete.weaknesses || 'Nenhum ponto fraco significativo identificado';

    // Gerar resumo técnico geral do atleta COM IA
    let technicalSummary = aiSummary; // Usar o resumo gerado pela IA
    
    if (!technicalSummary) {
      // Fallback se a IA ainda não gerou ou falhou
      if (analyses.length > 0) {
        technicalSummary = 'Gerando resumo técnico com IA...';
      } else {
        technicalSummary = athlete.style 
          ? `${athlete.name} pratica ${athlete.style}. Aguardando análises de vídeo para gerar perfil técnico detalhado.`
          : 'Envie vídeos de lutas para a IA gerar um perfil técnico completo automaticamente.';
      }
    }

    return { 
      radarData, 
      attacksData, 
      strongAttacksText, 
      weaknessesText, 
      technicalSummary,
      // Exportar stats para usar na geração do resumo IA
      stats: {
        totalSubmissions,
        totalSweeps,
        completedSweeps,
        totalBackTakes,
        topTechniques: attacksData.slice(0, 5).map(t => t.name),
        attributes: {
          condicionamento,
          tecnica,
          agressividade,
          defesa,
          movimentacao
        }
      }
    };
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
  const { radarData: athleteRadarData, attacksData, strongAttacksText, weaknessesText } = processAnalysesData();

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
          <div className="panel__head mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="panel__title text-xl">Perfil Técnico Completo</h3>
                  <p className="text-sm text-indigo-600 font-medium mt-0.5">
                    Análise consolidada de {analyses.length} {analyses.length === 1 ? 'vídeo' : 'vídeos'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!aiSummary && !loadingSummary && (
                  <button
                    onClick={handleGenerateSummary}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Gerar com IA
                  </button>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-indigo-200 shadow-sm">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-xs font-bold text-indigo-700">IA Gemini</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-indigo-100">
            {loadingSummary ? (
              <div className="flex items-center gap-3 text-indigo-600">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium">Gerando resumo técnico com IA...</span>
              </div>
            ) : aiSummary ? (
              <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap">
                {aiSummary}
              </p>
            ) : (
              <p className="text-sm text-slate-600 italic">
                Clique em "Gerar com IA" para criar um resumo técnico profissional baseado em todas as análises.
              </p>
            )}
          </div>
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
          <div>
            <p className="eyebrow">Perfil geral</p>
            <h3 className="panel__title">Informações principais</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[{
            label: 'Idade',
            value: `${athlete.age} anos`,
            accent: 'text-primary'
          }, {
            label: 'Peso',
            value: `${athlete.weight} kg`,
            accent: 'text-primary'
          }, {
            label: 'Faixa',
            value: athlete.belt,
            accent: 'text-secondary'
          }, {
            label: 'Condicionamento',
            value: `${athlete.cardio}%`,
            accent: 'text-accent'
          }].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl bg-white px-6 py-8 sm:px-8 sm:py-9 text-center shadow-[0_15px_35px_rgba(15,23,42,0.08)]"
            >
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className={`mt-3 text-3xl font-bold text-slate-900 ${item.accent}`}>{item.value}</p>
            </div>
          ))}
        </div>
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
        />
      )}

      {/* Gráficos */}
      <div className={`grid grid-cols-1 gap-6 lg:grid-cols-2 ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
        <section className="panel">
          <div className="panel__head mb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow">Perfil</p>
                <h3 className="panel__title">Perfil de atributos</h3>
              </div>
              {analyses.length > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium text-emerald-700">Dados da IA</span>
                </div>
              )}
            </div>
            {analyses.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Baseado em {analyses.length} {analyses.length === 1 ? 'análise' : 'análises'} de vídeo
              </p>
            )}
          </div>
          <div className="chart-area">
            <StatsRadarChart data={athleteRadarData} />
          </div>
        </section>
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
              <div className="flex items-center justify-between">
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

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-red-500">Atenção</p>
                <h3 className="text-lg font-semibold text-slate-900">Excluir atleta</h3>
              </div>
            </div>
            <p className="text-slate-600 mb-6">Essa ação é permanente e removerá todos os dados do atleta <strong>{athlete.name}</strong>. Deseja continuar?</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 disabled:opacity-60"
              >
                {isDeleting ? 'Removendo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
