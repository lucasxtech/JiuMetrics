import { useState, useEffect } from 'react';
import { isValidVideoUrl } from '../../services/videoAnalysisService';
import { useAnalysisProgress } from '../../contexts/AnalysisProgressContext';
import { getAllAthletes } from '../../services/athleteService';
import { getAllOpponents } from '../../services/opponentService';
import { createAthlete } from '../../services/athleteService';
import { createOpponent } from '../../services/opponentService';
import PieChartSection from '../charts/PieChartSection';
import CustomSelect from '../common/CustomSelect';
import QuickAddModal from '../common/QuickAddModal';

export default function VideoAnalysisComponent() {
  const [videos, setVideos] = useState([
    { id: 1, url: '', giColor: 'preto' }
  ]);
  const [error, setError] = useState(null);
  const [athleteName, setAthleteName] = useState('');
  const [matchResult, setMatchResult] = useState('');

  // Novos estados para vincular análise
  const [personType, setPersonType] = useState('athlete'); // 'athlete' ou 'opponent'
  const [personId, setPersonId] = useState('');
  const [athletes, setAthletes] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);

  // Estado para modal de cadastro rápido
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);

  const { isLoading, analysis, processingStage, processingProgress, analysisError, startAnalysis } = useAnalysisProgress();

  const giColorOptions = [
    { value: 'preto', label: 'Preto' },
    { value: 'branco', label: 'Branco' },
    { value: 'azul', label: 'Azul' },
  ];

  // Carregar atletas e adversários
  useEffect(() => {
    const loadPeople = async () => {
      try {
        const [athletesData, opponentsData] = await Promise.all([
          getAllAthletes(),
          getAllOpponents()
        ]);
        setAthletes(athletesData?.data || []);
        setOpponents(opponentsData?.data || []);
      } catch (err) {
        console.error('Erro ao carregar atletas/adversários:', err);
        setAthletes([]);
        setOpponents([]);
      } finally {
        setLoadingPeople(false);
      }
    };
    loadPeople();
  }, []);

  // Atualizar athleteName quando personId mudar
  const selectedPerson = personId 
    ? (personType === 'athlete' 
        ? athletes.find(a => a.id === personId)
        : opponents.find(o => o.id === personId))
    : null;
    
  useEffect(() => {
    if (selectedPerson) {
      setAthleteName(selectedPerson.name);
    } else {
      setAthleteName('');
    }
  }, [selectedPerson]);

  // Função para criar atleta/adversário via Quick Add
  const handleQuickAdd = async (formData) => {
    const createFn = personType === 'athlete' ? createAthlete : createOpponent;
    
    // Adicionar campos padrão que o backend espera
    const dataToSend = {
      ...formData,
      age: 25, // valor padrão
      weight: 75, // valor padrão
      style: 'Guardeiro' // valor padrão
    };
    
    const response = await createFn(dataToSend);
    
    if (response.success) {
      // Recarregar lista
      const fetchFn = personType === 'athlete' ? getAllAthletes : getAllOpponents;
      const updatedData = await fetchFn();
      
      if (personType === 'athlete') {
        setAthletes(updatedData.data || []);
      } else {
        setOpponents(updatedData.data || []);
      }
      
      // Selecionar automaticamente o novo item
      setPersonId(response.data.id);
    }
  };

  const addVideo = () => {
    setVideos([...videos, { id: Date.now(), url: '', file: null, giColor: 'preto' }]);
  };

  const removeVideo = (id) => {
    if (videos.length > 1) {
      setVideos(videos.filter(v => v.id !== id));
    }
  };

  const updateVideo = (id, field, value) => {
    setVideos(videos.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleAnalyzeUrl = async (e) => {
    e.preventDefault();
    
    const validVideos = videos.filter(v => v.url.trim());
    if (validVideos.length === 0) {
      setError('Por favor, insira ao menos uma URL de vídeo');
      return;
    }
    
    for (const video of validVideos) {
      if (!isValidVideoUrl(video.url)) {
        setError('Uma ou mais URLs são inválidas. Use YouTube, Vimeo ou links diretos válidos');
        return;
      }
    }
    
    if (!personId) {
      setError('Selecione um atleta ou adversário para vincular a análise');
      return;
    }

    setError(null);
    startAnalysis({
      videos: validVideos.map(v => ({ url: v.url, giColor: v.giColor })),
      athleteName: athleteName.trim(),
      personId,
      personType,
      matchResult: matchResult || undefined,
      belt: selectedPerson?.belt || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <section className="panel panel--hero">
        <div>
          <p className="eyebrow">Análise</p>
          <h1 className="hero-title">Análise de vídeo com IA</h1>
          <p className="hero-description">Cole o link da luta para gerar insights, gráficos e resumos com Gemini Vision.</p>
        </div>
        <div className="hero-meta">
          <p>Suporte para YouTube, Vimeo e Google Drive.</p>
        </div>
      </section>

      <section className="panel">
          <form onSubmit={handleAnalyzeUrl} className="space-y-6">
            {/* Seletor de atleta/adversário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Tipo</label>
                <CustomSelect
                  value={personType}
                  onChange={(value) => {
                    setPersonType(value);
                    setPersonId('');
                    setError(null);
                  }}
                  options={[
                    { value: 'athlete', label: 'Atleta' },
                    { value: 'opponent', label: 'Adversário' }
                  ]}
                  disabled={loadingPeople}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  {personType === 'athlete' ? 'Atleta' : 'Adversário'}
                </label>
                <CustomSelect
                  value={personId}
                  onChange={(value) => {
                    setPersonId(value);
                    setError(null);
                  }}
                  options={
                    personType === 'athlete'
                      ? athletes.map(a => ({ value: a.id, label: a.name }))
                      : opponents.map(o => ({ value: o.id, label: o.name }))
                  }
                  placeholder="Selecione..."
                  disabled={loadingPeople}
                  onCreateNew={() => setShowQuickAddModal(true)}
                  createNewLabel={`Criar novo ${personType === 'athlete' ? 'atleta' : 'adversário'}`}
                />
              </div>
            </div>

            {/* Resultado da luta (opcional) */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                Resultado da Luta <span className="text-slate-400">(opcional - melhora a precisão)</span>
              </label>
              <CustomSelect
                value={matchResult}
                onChange={(value) => {
                  setMatchResult(value);
                  setError(null);
                }}
                options={[
                  { value: '', label: 'Não informado', subtitle: 'IA analisará sem contexto de resultado' },
                  { value: 'vitoria-pontos', label: '🏆 Vitória por Pontos', subtitle: 'Venceu no placar' },
                  { value: 'vitoria-finalizacao', label: '🎯 Vitória por Finalização', subtitle: 'Finalizou o oponente' },
                  { value: 'vitoria-vantagens', label: '⚖️ Vitória por Vantagens', subtitle: 'Placar empatado, mais vantagens' },
                  { value: 'derrota-pontos', label: '❌ Derrota por Pontos', subtitle: 'Perdeu no placar' },
                  { value: 'derrota-finalizacao', label: '🎯 Derrota por Finalização', subtitle: 'Foi finalizado' },
                  { value: 'derrota-vantagens', label: '⚖️ Derrota por Vantagens', subtitle: 'Placar empatado, menos vantagens' },
                  { value: 'derrota-desclassificacao', label: '🚫 Derrota por Desclassificação', subtitle: 'Punição ou regra' }
                ]}
                placeholder="Selecione o resultado..."
              />
              <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Informar o resultado ajuda a IA a identificar se o estilo foi eficaz ou se houve erros críticos
              </p>
            </div>

            {/* Lista de vídeos */}
            <div className="space-y-3">
              {videos.map((video, index) => (
                <div key={video.id} className="rounded-lg border border-slate-200 bg-slate-50 p-6 shadow-sm my-4">
                  {/* Header compacto */}
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-900">Vídeo {index + 1}</span>
                    {videos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVideo(video.id)}
                        className="text-xs text-slate-500 transition hover:text-red-600 cursor-pointer"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  {/* Campos do card */}
                  <div className="space-y-2">
                    {/* URL */}
                    <div>
                      <input
                        type="text"
                        className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                        value={video.url}
                        onChange={(e) => {
                          updateVideo(video.id, 'url', e.target.value);
                          setError(null);
                        }}
                        placeholder="URL do vídeo (YouTube, Vimeo...)"
                      />
                    </div>

                    {/* Cor do kimono - chips */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-slate-600">Cor do kimono</label>
                      <div className="flex flex-wrap gap-1.5">
                        {giColorOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              updateVideo(video.id, 'giColor', option.value);
                              setError(null);
                            }}
                            className={`rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                              video.giColor === option.value
                                ? 'border border-blue-500 bg-blue-50 text-blue-700'
                                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Erro */}
            {(error || analysisError) && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error || analysisError}
              </div>
            )}

            {/* Botão principal */}
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 text-sm font-semibold transition-all ${
                  isLoading
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                    Analisando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Analisar {videos.length > 1 ? `${videos.length} vídeos` : 'vídeo'}
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

      {analysis && (
        <section className="panel">
          <div className="section-header mb-8">
            <p className="section-header__eyebrow">Resultado</p>
            <h2 className="section-header__title">Análise concluída</h2>
          </div>

          {/* Resumo Técnico - Cards Organizados */}
          {analysis.data?.summary && (
            <div className="mb-8">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Resumo Técnico
              </h3>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="text-sm text-slate-700 leading-relaxed space-y-3">
                  {analysis.data.summary.split(/\n\n|\. (?=[A-Z])/).filter(p => p.trim()).map((paragraph, idx) => (
                    <p key={idx}>{paragraph.trim()}{paragraph.endsWith('.') ? '' : '.'}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* KPI Dashboard - Estatísticas */}
          {analysis.data?.technical_stats && (
            <div className="mb-8">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Dashboard de Performance
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Finalizações KPI */}
                {analysis.data.technical_stats.submissions?.tentativas > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">Finalizações</span>
                      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-3xl font-bold text-slate-900">{analysis.data.technical_stats.submissions.tentativas}</p>
                        <p className="text-xs text-slate-500 mt-1">Tentativas</p>
                      </div>
                      <div className="flex gap-3 pt-2 border-t border-slate-100">
                        <div>
                          <p className="text-xl font-bold text-blue-600">{analysis.data.technical_stats.submissions.ajustadas}</p>
                          <p className="text-xs text-slate-500">Ajustadas</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-green-600">{analysis.data.technical_stats.submissions.concluidas}</p>
                          <p className="text-xs text-slate-500">Concluídas</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Badges dos golpes */}
                    {analysis.data.technical_stats.submissions.detalhes && Array.isArray(analysis.data.technical_stats.submissions.detalhes) && analysis.data.technical_stats.submissions.detalhes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Golpes:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.data.technical_stats.submissions.detalhes.map((detail, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {typeof detail === 'string' ? detail : detail.nome || detail.name || JSON.stringify(detail)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Raspagens KPI */}
                {analysis.data.technical_stats.sweeps?.quantidade > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">Raspagens</span>
                      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-3xl font-bold text-slate-900">{analysis.data.technical_stats.sweeps.quantidade}</p>
                        <p className="text-xs text-slate-500 mt-1">Tentativas</p>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xl font-bold text-green-600">{analysis.data.technical_stats.sweeps.efetividade_percentual}%</p>
                        <p className="text-xs text-slate-500">Taxa de sucesso</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Passagens de Guarda KPI */}
                {analysis.data.technical_stats.guard_passes?.quantidade > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">Passagens</span>
                      <span className="text-xl">🚀</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-3xl font-bold text-slate-900">{analysis.data.technical_stats.guard_passes.quantidade}</p>
                        <p className="text-xs text-slate-500 mt-1">Passagens</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pegadas de Costas KPI */}
                {analysis.data.technical_stats.back_takes?.quantidade > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold tracking-wide text-slate-500 uppercase">Costas</span>
                      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-3xl font-bold text-slate-900">{analysis.data.technical_stats.back_takes.quantidade}</p>
                        <p className="text-xs text-slate-500 mt-1">Pegadas</p>
                      </div>
                      {analysis.data.technical_stats.back_takes.tentou_finalizar && (
                        <div className="pt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            ✓ Tentou finalizar
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gráficos */}
          {analysis.data?.charts?.map((chart, idx) => (
            <div key={idx} className="mb-8">
              <PieChartSection title={chart.title} data={{ titulo: chart.title, dados: chart.data }} />
            </div>
          ))}

          {analysis.data?.chartUrls?.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                Gráficos em Alta Resolução
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {analysis.data.chartUrls.map((chart, idx) => (
                  <a
                    key={idx}
                    href={chart.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-2xl border border-slate-200 px-6 py-4 text-center font-semibold text-slate-700 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
                  >
                    {chart.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-500">
            ✓ Análise gerada em {analysis.data?.generatedAt && new Date(analysis.data.generatedAt).toLocaleString('pt-BR')}
          </p>
        </section>
      )}

      {isLoading && (
        <section className="panel flex flex-col items-center gap-16">
          {/* Barra de progresso animada */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg font-semibold text-slate-900">{processingStage}</p>
              <p className="text-sm font-bold text-blue-600">{processingProgress}%</p>
            </div>
            
            {/* Barra de progresso com gradiente */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
                style={{ width: `${processingProgress}%` }}
              >
                <div className="h-full w-full animate-pulse bg-white/20"></div>
              </div>
            </div>
          </div>

          {/* Indicador visual */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-12">
              <div className="h-24 w-24 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">
                  {processingProgress < 40
                    ? <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    : processingProgress < 90
                    ? <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    : <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  }
                </span>
              </div>
            </div>
            
            <div className="max-w-lg">
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Análise em andamento
              </h3>
              <p className="text-slate-600 leading-relaxed">
                O Gemini está processando o vídeo completo para gerar dados cirúrgicos e insights técnicos. 
                Este processo geralmente leva cerca de <strong>40 segundos</strong>.
              </p>
            </div>
          </div>

          {/* Etapas do processo */}
          <div className="w-full max-w-3xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className={`rounded-xl border-2 p-5 transition-all ${processingProgress >= 20 ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'}`}>
                <p className="text-sm font-bold text-slate-700 mb-2">1. Download</p>
                <p className="text-3xl">{processingProgress >= 20 ? '✓' : '⏳'}</p>
              </div>
              <div className={`rounded-xl border-2 p-5 transition-all ${processingProgress >= 40 ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'}`}>
                <p className="text-sm font-bold text-slate-700 mb-2">2. Upload</p>
                <p className="text-3xl">{processingProgress >= 40 ? '✓' : '⏳'}</p>
              </div>
              <div className={`rounded-xl border-2 p-5 transition-all ${processingProgress >= 70 ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'}`}>
                <p className="text-sm font-bold text-slate-700 mb-2">3. Análise IA</p>
                <p className="text-3xl">
                  {processingProgress >= 70
                    ? <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-7 h-7 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  }
                </p>
              </div>
              <div className={`rounded-xl border-2 p-5 transition-all ${processingProgress >= 100 ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white'}`}>
                <p className="text-sm font-bold text-slate-700 mb-2">4. Conclusão</p>
                <p className="text-3xl">{processingProgress >= 100 ? '✓' : '⏳'}</p>
              </div>
            </div>
          </div>

          {/* Dica */}
          <div className="w-full max-w-2xl rounded-xl border-2 border-amber-200 bg-amber-50 px-6 py-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div className="text-left">
                <p className="text-sm font-bold text-amber-900 mb-1">Dica</p>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Vídeos mais longos podem levar um pouco mais de tempo. Você pode continuar trabalhando 
                  em outras abas enquanto aguarda.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {!analysis && !isLoading && (
        <section className="panel text-center">
          <div className="space-y-3">
            <p className="text-4xl" aria-hidden="true">🎬</p>
            <h3 className="panel__title">Nenhuma análise realizada</h3>
            <p className="text-slate-600">
              Cole um link acima e clique em "Analisar vídeo" para começar.
            </p>
          </div>
        </section>
      )}

      {/* Modal de Cadastro Rápido */}
      <QuickAddModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        type={personType}
        onSuccess={handleQuickAdd}
      />
    </div>
  );
}
