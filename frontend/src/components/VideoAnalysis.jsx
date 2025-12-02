import { useState, useEffect } from 'react';
import { analyzeVideoLink, isValidVideoUrl } from '../services/videoAnalysisService';
import { uploadVideo, isValidVideoFile } from '../services/videoUploadService';
import { getAllAthletes } from '../services/athleteService';
import { getAllOpponents } from '../services/opponentService';
import PieChartSection from './PieChartSection';

export default function VideoAnalysisComponent() {
  const [videos, setVideos] = useState([
    { id: 1, url: '', file: null, giColor: 'preto' }
  ]);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('url');
  const [athleteName, setAthleteName] = useState('');
  
  // Novos estados para vincular análise
  const [personType, setPersonType] = useState('athlete'); // 'athlete' ou 'opponent'
  const [personId, setPersonId] = useState('');
  const [athletes, setAthletes] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(true);

  const giColorOptions = [
    { value: 'preto', label: 'Preto' },
    { value: 'branco', label: 'Branco' },
    { value: 'azul', label: 'Azul' },
    { value: 'colorido', label: 'Outro' },
  ];

  const tabButtonClass = (tab) =>
    `inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
      activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

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
  useEffect(() => {
    if (personId) {
      const person = personType === 'athlete' 
        ? athletes.find(a => a.id === personId)
        : opponents.find(o => o.id === personId);
      if (person) {
        setAthleteName(person.name);
      }
    } else {
      setAthleteName('');
    }
  }, [personId, personType, athletes, opponents]);

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

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeVideoLink({
        videos: validVideos.map(v => ({ url: v.url, giColor: v.giColor })),
        athleteName: athleteName.trim(),
        personId,
        personType
      });
      if (result.data) {
        setAnalysis(result);
      } else {
        setError('Nenhum dado retornado da análise');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.response?.data?.details || err.message || 'Erro ao analisar os vídeos. Tente novamente.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    const validVideos = videos.filter(v => v.file);
    if (validVideos.length === 0) {
      setError('Por favor, selecione ao menos um arquivo de vídeo');
      return;
    }
    
    for (const video of validVideos) {
      if (!isValidVideoFile(video.file)) {
        setError('Um ou mais arquivos são inválidos. Use MP4, AVI, MOV ou formatos suportados');
        return;
      }
    }
    
    if (!personId) {
      setError('Selecione um atleta ou adversário para vincular a análise');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await uploadVideo({
        videos: validVideos.map(v => ({ file: v.file, giColor: v.giColor })),
        athleteName: athleteName.trim(),
        personId,
        personType
      });
      if (result.data) {
        setAnalysis(result);
      } else {
        setError('Nenhum dado retornado da análise');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.response?.data?.details || err.message || 'Erro ao processar os vídeos. Tente novamente.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      setVideos([{ id: 1, url: '', file: null, giColor: 'preto' }]);
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel panel--hero">
        <div>
          <p className="eyebrow">Análise</p>
          <h1 className="hero-title">Análise de vídeo com IA</h1>
          <p className="hero-description">Cole o link da luta ou envie um arquivo para gerar insights, gráficos e resumos com Gemini Vision.</p>
        </div>
        <div className="hero-meta">
          <p>Suporte para YouTube, Vimeo, Google Drive e uploads locais (MP4, MOV, AVI).</p>
        </div>
      </section>

      <section className="panel">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={tabButtonClass('url')}
            onClick={() => {
              setActiveTab('url');
              setError(null);
            }}
          >
            <span aria-hidden="true">🔗</span>
            Analisar por link
          </button>
          <button
            type="button"
            className={tabButtonClass('upload')}
            onClick={() => {
              setActiveTab('upload');
              setError(null);
            }}
          >
            <span aria-hidden="true">📁</span>
            Upload de vídeo
          </button>
        </div>
      </section>

      {activeTab === 'url' && (
        <section className="panel">
          <form onSubmit={handleAnalyzeUrl} className="space-y-6">
            {/* Seletor de atleta/adversário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Tipo</label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                  value={personType}
                  onChange={(e) => {
                    setPersonType(e.target.value);
                    setPersonId('');
                    setError(null);
                  }}
                  disabled={loadingPeople}
                >
                  <option value="athlete">Atleta</option>
                  <option value="opponent">Adversário</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  {personType === 'athlete' ? 'Atleta' : 'Adversário'}
                </label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                  value={personId}
                  onChange={(e) => {
                    setPersonId(e.target.value);
                    setError(null);
                  }}
                  disabled={loadingPeople}
                >
                  <option value="">Selecione...</option>
                  {personType === 'athlete' 
                    ? athletes.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))
                    : opponents.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))
                  }
                </select>
              </div>
            </div>

            {/* Lista de vídeos */}
            <div className="space-y-3">
              {videos.map((video, index) => (
                <div key={video.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
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

              {/* Botão adicionar - pequeno e discreto */}
              <button
                type="button"
                onClick={addVideo}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                <span>+</span>
                Adicionar vídeo
              </button>
            </div>

            {/* Erro */}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Botão principal - alinhado à direita em desktop */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full sm:w-auto rounded-md px-4 py-2 text-sm font-medium transition ${
                  isLoading
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                    Analisando...
                  </span>
                ) : (
                  `Analisar ${videos.length > 1 ? `${videos.length} vídeos` : 'vídeo'}`
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'upload' && (
        <section className="panel">
          <form onSubmit={handleFileUpload} className="space-y-6">
            {/* Seletor de atleta/adversário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">Tipo</label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                  value={personType}
                  onChange={(e) => {
                    setPersonType(e.target.value);
                    setPersonId('');
                    setError(null);
                  }}
                  disabled={loadingPeople}
                >
                  <option value="athlete">Atleta</option>
                  <option value="opponent">Adversário</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  {personType === 'athlete' ? 'Atleta' : 'Adversário'}
                </label>
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                  value={personId}
                  onChange={(e) => {
                    setPersonId(e.target.value);
                    setError(null);
                  }}
                  disabled={loadingPeople}
                >
                  <option value="">Selecione...</option>
                  {personType === 'athlete' 
                    ? athletes.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))
                    : opponents.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))
                  }
                </select>
              </div>
            </div>

            {/* Lista de vídeos */}
            <div className="space-y-3">
              {videos.map((video, index) => (
                <div key={video.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
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
                    {/* Upload */}
                    <div>
                      <label
                        htmlFor={`video-upload-${video.id}`}
                        className="flex cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-4 text-center transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {video.file ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">✓</span>
                            <span className="text-xs font-medium text-slate-700 truncate max-w-[200px]">{video.file.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📁</span>
                            <span className="text-xs font-medium text-slate-600">Selecionar arquivo</span>
                          </div>
                        )}
                      </label>
                      <input
                        id={`video-upload-${video.id}`}
                        type="file"
                        accept="video/*"
                        className="sr-only"
                        onChange={(e) => {
                          updateVideo(video.id, 'file', e.target.files?.[0] || null);
                          setError(null);
                        }}
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

              {/* Botão adicionar - pequeno e discreto */}
              <button
                type="button"
                onClick={addVideo}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                <span>+</span>
                Adicionar vídeo
              </button>
            </div>

            {/* Erro */}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Botão principal - alinhado à direita em desktop */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || videos.every(v => !v.file)}
                className={`w-full sm:w-auto rounded-md px-4 py-2 text-sm font-medium transition ${
                  isLoading || videos.every(v => !v.file)
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                    Processando...
                  </span>
                ) : (
                  `Enviar e analisar ${videos.filter(v => v.file).length > 1 ? `${videos.filter(v => v.file).length} vídeos` : 'vídeo'}`
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {analysis && (
        <section className="panel space-y-6">
          <div className="section-header">
            <p className="section-header__eyebrow">Resultado</p>
            <h2 className="section-header__title">Análise concluída</h2>
          </div>

          {analysis.data?.summary && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-900">
              <p className="mb-2 text-xs font-semibold tracking-wide text-amber-700">Resumo técnico</p>
              <p>{analysis.data.summary}</p>
            </div>
          )}

          {analysis.data?.charts?.map((chart, idx) => (
            <PieChartSection key={idx} title={chart.title} data={{ titulo: chart.title, dados: chart.data }} />
          ))}

          {analysis.data?.chartUrls?.length > 0 && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-900">Gráficos em alta resolução</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {analysis.data.chartUrls.map((chart, idx) => (
                  <a
                    key={idx}
                    href={chart.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    📈 {chart.title}
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
        <section className="panel space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-b-slate-900"></div>
          <p className="font-medium text-slate-700">
            {activeTab === 'url' ? '🔬 Analisando com IA Gemini...' : '🎬 Processando vídeo...'}
          </p>
          <p className="text-sm text-slate-500">
            {activeTab === 'url'
              ? 'Gerando dados e gráficos (aprox. 30-60 segundos).'
              : 'Extraindo frames e analisando com Gemini Vision (2-5 minutos).'}
          </p>
        </section>
      )}

      {!analysis && !isLoading && (
        <section className="panel text-center">
          <div className="space-y-3">
            <p className="text-4xl" aria-hidden="true">🎬</p>
            <h3 className="panel__title">Nenhuma análise realizada</h3>
            <p className="text-slate-600">
              {activeTab === 'url'
                ? 'Cole um link acima e clique em “Analisar vídeo” para começar.'
                : 'Selecione um arquivo e clique em “Enviar e analisar” para começar.'}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
