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
      setError('Informe o nome do atleta e a cor do kimono');
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
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Erro ao analisar o vídeo. Tente novamente.';
      console.error('Erro completo:', err);
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
      setError('Arquivo inválido. Use MP4, AVI, MOV ou outros formatos de vídeo');
      return;
    }
    if (!athleteName.trim() || !giColor) {
      setError('Informe o nome do atleta e a cor do kimono');
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
      const errorMsg = err.response?.data?.error || err.response?.data?.details || err.message || 'Erro ao processar o vídeo. Tente novamente.';
      console.error('Erro completo:', err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      setVideoFile(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Cabeçalho */}
      <div>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#1f2937' }}>Análise de Vídeo com IA</h1>
        <p style={{ color: '#6b7280', marginTop: '4px' }}>Cole o link da luta ou faça upload do vídeo para análise com Gemini Vision</p>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => {
            setActiveTab('url');
            setError(null);
          }}
          style={{
            padding: '12px 24px',
            border: 'none',
            backgroundColor: activeTab === 'url' ? '#4f46e5' : '#f3f4f6',
            color: activeTab === 'url' ? 'white' : '#6b7280',
            cursor: 'pointer',
            fontWeight: '600',
            borderBottom: activeTab === 'url' ? '3px solid #4f46e5' : 'none',
            marginBottom: '-2px',
            transition: 'all 0.3s',
          }}
        >
          🔗 Analisar por Link
        </button>
        <button
          onClick={() => {
            setActiveTab('upload');
            setError(null);
          }}
          style={{
            padding: '12px 24px',
            border: 'none',
            backgroundColor: activeTab === 'upload' ? '#4f46e5' : '#f3f4f6',
            color: activeTab === 'upload' ? 'white' : '#6b7280',
            cursor: 'pointer',
            fontWeight: '600',
            borderBottom: activeTab === 'upload' ? '3px solid #4f46e5' : 'none',
            marginBottom: '-2px',
            transition: 'all 0.3s',
          }}
        >
          📁 Upload de Vídeo
        </button>
      </div>

      {/* Formulário - Link */}
      {activeTab === 'url' && (
        <form onSubmit={handleAnalyzeUrl} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
            <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
              URL do Vídeo da Luta
            </label>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setError(null);
              }}
              placeholder="Cole aqui o link do YouTube, Vimeo ou outro..."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '6px',
                border: error ? '2px solid #ef4444' : '1px solid #d1d5db',
                fontSize: '16px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                transition: 'border-color 0.3s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4f46e5';
                e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = error ? '#ef4444' : '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              ✓ Suporta: YouTube, Vimeo, Google Drive, links diretos
            </p>
          </div>
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                Nome do atleta que será analisado
              </label>
              <input
                type="text"
                value={athleteName}
                onChange={(e) => {
                  setAthleteName(e.target.value);
                  setError(null);
                }}
                placeholder="Ex.: João Silva"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                Cor do kimono no vídeo
              </label>
              <select
                value={giColor}
                onChange={(e) => {
                  setGiColor(e.target.value);
                  setError(null);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
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
            <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px 16px', color: '#991b1b' }}>
              <p style={{ fontSize: '14px', fontWeight: '500' }}>⚠️ {error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: 'linear-gradient(to right, #4f46e5, #3b82f6)',
              color: 'white',
              padding: '14px 24px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
              transition: 'all 0.3s',
              opacity: isLoading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.boxShadow = '0 8px 20px rgba(79, 70, 229, 0.6)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {isLoading ? '🔄 Analisando...' : '▶️ Analisar Vídeo'}
          </button>
        </form>
      )}

      {/* Formulário - Upload */}
      {activeTab === 'upload' && (
        <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
            <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              Selecione um arquivo de vídeo
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                setVideoFile(e.target.files?.[0] || null);
                setError(null);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '16px',
                borderRadius: '6px',
                border: '2px dashed #d1d5db',
                backgroundColor: '#f9fafb',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#6b7280',
                transition: 'all 0.3s',
              }}
            />
            {videoFile && (
              <p style={{ fontSize: '14px', color: '#059669', marginTop: '8px', fontWeight: '500' }}>
                ✓ Arquivo selecionado: {videoFile.name}
              </p>
            )}
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '12px' }}>
              ✓ Formatos suportados: MP4, AVI, MOV, MKV, MPEG
              <br />
              ✓ Tamanho máximo: 500MB
              <br />
              ⚠️ Análise pode levar de 2-5 minutos dependendo do tamanho do vídeo
            </p>
          </div>
          <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                Nome do atleta que será analisado
              </label>
              <input
                type="text"
                value={athleteName}
                onChange={(e) => {
                  setAthleteName(e.target.value);
                  setError(null);
                }}
                placeholder="Ex.: Maria Santos"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                Cor do kimono no vídeo
              </label>
              <select
                value={giColor}
                onChange={(e) => {
                  setGiColor(e.target.value);
                  setError(null);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
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
            <div style={{ backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px 16px', color: '#991b1b' }}>
              <p style={{ fontSize: '14px', fontWeight: '500' }}>⚠️ {error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading || !videoFile}
            style={{
              background: isLoading || !videoFile ? '#d1d5db' : 'linear-gradient(to right, #4f46e5, #3b82f6)',
              color: 'white',
              padding: '14px 24px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              border: 'none',
              cursor: (isLoading || !videoFile) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
              transition: 'all 0.3s',
              opacity: (isLoading || !videoFile) ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading && videoFile) {
                e.target.style.boxShadow = '0 8px 20px rgba(79, 70, 229, 0.6)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {isLoading ? '🔄 Processando vídeo...' : '📤 Enviar e Analisar'}
          </button>
        </form>
      )}

      {/* Resultado */}
      {analysis && (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '24px' }}>
            📊 Análise Concluída
          </h2>

          {/* Resumo Estratégico */}
          {analysis.data?.summary && (
            <div style={{
              backgroundColor: '#fef3c7',
              border: '2px solid #fcd34d',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '32px',
              color: '#713f12',
              lineHeight: '1.6',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginTop: 0, marginBottom: '12px' }}>
                📌 RESUMO TÉCNICO
              </h3>
              <p style={{ margin: 0 }}>
                {analysis.data.summary}
              </p>
            </div>
          )}

          {/* Gráficos */}
          {analysis.data?.charts && analysis.data.charts.map((chart, idx) => (
            <PieChartSection 
              key={idx}
              title={chart.title}
              data={{ titulo: chart.title, dados: chart.data }}
            />
          ))}

          {/* Links dos Gráficos QuickChart */}
          {analysis.data?.chartUrls && analysis.data.chartUrls.length > 0 && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
                🎨 Gráficos de Alta Resolução
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                {analysis.data.chartUrls.map((chart, idx) => (
                  <a
                    key={idx}
                    href={chart.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '16px',
                      textAlign: 'center',
                      textDecoration: 'none',
                      color: '#0284c7',
                      fontWeight: '600',
                      transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#dbeafe';
                      e.target.style.borderColor = '#0284c7';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f0f9ff';
                      e.target.style.borderColor = '#bfdbfe';
                    }}
                  >
                    📈 {chart.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '24px', textAlign: 'center' }}>
            ✓ Análise realizada em {analysis.data?.generatedAt && new Date(analysis.data.generatedAt).toLocaleString('pt-BR')}
          </p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{
            display: 'inline-block',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #4f46e5',
            animation: 'spin 1s linear infinite',
          }}></div>
          <p style={{ color: '#6b7280', marginTop: '20px', fontSize: '16px', fontWeight: '500' }}>
            {activeTab === 'url' ? '🔬 Analisando com IA Gemini...' : '🎬 Processando vídeo...'}
          </p>
          <p style={{ color: '#9ca3af', marginTop: '8px', fontSize: '14px' }}>
            {activeTab === 'url' ? 'Gerando dados estatísticos e gráficos. Isso pode levar 30-60 segundos.' : 'Extraindo frames e analisando com Gemini Vision. Isso pode levar 2-5 minutos.'}
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Placeholder */}
      {!analysis && !isLoading && (
        <div style={{ backgroundColor: '#f0f9ff', borderRadius: '8px', padding: '48px', textAlign: 'center', border: '2px dashed #bfdbfe' }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</p>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', marginBottom: '8px' }}>
            Nenhuma análise realizada
          </h3>
          <p style={{ color: '#6b7280', marginBottom: 0 }}>
            {activeTab === 'url' 
              ? 'Cole um link de vídeo acima e clique em "Analisar Vídeo" para começar' 
              : 'Selecione um arquivo de vídeo e clique em "Enviar e Analisar" para começar'}
          </p>
        </div>
      )}
    </div>
  );
}
