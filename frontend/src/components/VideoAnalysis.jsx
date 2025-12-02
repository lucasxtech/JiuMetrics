import { useState } from 'react';
import { analyzeVideoLink, isValidVideoUrl } from '../services/videoAnalysisService';
import { uploadVideo, isValidVideoFile } from '../services/videoUploadService';
import PieChartSection from './PieChartSection';

export default function VideoAnalysisComponent() {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('url');
  const [athleteName, setAthleteName] = useState('');
  const [giColor, setGiColor] = useState('preto');

  const tabButtonClass = (tab) =>
    `inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
      activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  const primaryButtonClass = (disabled) =>
    `inline-flex items-center gap-2 rounded-xl px-5 py-3 text-white transition ${
      disabled ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
    }`;

  const giColorOptions = [
    { value: 'branco', label: 'Branco' },
    { value: 'azul', label: 'Azul' },
    { value: 'preto', label: 'Preto' },
    { value: 'colorido', label: 'Outro / Colorido' },
  ];

  const handleAnalyzeUrl = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      setError('Por favor, insira uma URL de vídeo');
      return;
    }
    if (!isValidVideoUrl(videoUrl)) {
      setError('URL inválida. Use YouTube, Vimeo ou um link direto válido');
      return;
    }
    if (!athleteName.trim() || !giColor) {
      setError('Informe o nome do atleta e a cor do kimono para orientar a IA');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeVideoLink({
        url: videoUrl,
        athleteName: athleteName.trim(),
        giColor,
      });
      if (result.data) {
        setAnalysis(result);
      } else {
        setError('Nenhum dado retornado da análise');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.response?.data?.details || err.message || 'Erro ao analisar o vídeo. Tente novamente.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      setError('Por favor, selecione um arquivo de vídeo');
      return;
    }
    if (!isValidVideoFile(videoFile)) {
      setError('Arquivo inválido. Use MP4, AVI, MOV ou formatos suportados');
      return;
    }
    if (!athleteName.trim() || !giColor) {
      setError('Informe o nome do atleta e a cor do kimono para orientar a IA');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await uploadVideo({
        file: videoFile,
        athleteName: athleteName.trim(),
        giColor,
      });
      if (result.data) {
        setAnalysis(result);
      } else {
        setError('Nenhum dado retornado da análise');
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.response?.data?.details || err.message || 'Erro ao processar o vídeo. Tente novamente.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      setVideoFile(null);
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
          <form onSubmit={handleAnalyzeUrl} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">URL do vídeo da luta</label>
              <input
                type="text"
                className="w-full font-mono"
                value={videoUrl}
                onChange={(e) => {
                  setVideoUrl(e.target.value);
                  setError(null);
                }}
                placeholder="Cole aqui o link do YouTube, Vimeo ou outro..."
              />
              <p className="mt-2 text-sm text-slate-500">✓ Suporta YouTube, Vimeo, Google Drive e links diretos.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Nome do atleta no vídeo</label>
                <input
                  type="text"
                  className="w-full"
                  value={athleteName}
                  onChange={(e) => {
                    setAthleteName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Ex.: João Silva"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Cor do kimono</label>
                <select
                  className="w-full"
                  value={giColor}
                  onChange={(e) => {
                    setGiColor(e.target.value);
                    setError(null);
                  }}
                >
                  {giColorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
            )}
            <button type="submit" disabled={isLoading} className={primaryButtonClass(isLoading)}>
              <span aria-hidden="true">▶️</span>
              {isLoading ? 'Analisando...' : 'Analisar vídeo'}
            </button>
          </form>
        </section>
      )}

      {activeTab === 'upload' && (
        <section className="panel">
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">Selecione um arquivo de vídeo</p>
              <label
                htmlFor="video-upload"
                className="upload-zone flex cursor-pointer flex-col items-center gap-2 p-6 text-center text-slate-500"
              >
                <span className="text-2xl" aria-hidden="true">🎬</span>
                <span className="font-medium text-slate-700">Arraste ou clique para enviar</span>
                <span className="text-sm">MP4, AVI, MOV, MKV • até 500MB</span>
              </label>
              <input
                id="video-upload"
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(e) => {
                  setVideoFile(e.target.files?.[0] || null);
                  setError(null);
                }}
              />
              {videoFile && <p className="text-sm font-medium text-emerald-600">✓ Arquivo selecionado: {videoFile.name}</p>}
              <p className="text-sm text-slate-500">⚠️ A análise pode levar alguns minutos dependendo do tamanho do vídeo.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Nome do atleta no vídeo</label>
                <input
                  type="text"
                  className="w-full"
                  value={athleteName}
                  onChange={(e) => {
                    setAthleteName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Ex.: Maria Santos"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">Cor do kimono</label>
                <select
                  className="w-full"
                  value={giColor}
                  onChange={(e) => {
                    setGiColor(e.target.value);
                    setError(null);
                  }}
                >
                  {giColorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠️ {error}</div>
            )}
            <button type="submit" disabled={isLoading || !videoFile} className={primaryButtonClass(isLoading || !videoFile)}>
              <span aria-hidden="true">📤</span>
              {isLoading ? 'Processando vídeo...' : 'Enviar e analisar'}
            </button>
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
