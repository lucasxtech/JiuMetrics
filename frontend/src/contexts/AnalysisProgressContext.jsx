import { createContext, useContext, useState, useRef, useCallback } from 'react';
import { analyzeVideoLink } from '../services/videoAnalysisService';

const AnalysisProgressContext = createContext(null);

export function AnalysisProgressProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [lastSavedPersonId, setLastSavedPersonId] = useState(null);
  const [processingStage, setProcessingStage] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [analysisError, setAnalysisError] = useState(null);
  const intervalRef = useRef(null);

  const startAnalysis = useCallback(async ({ videos, athleteName, personId, personType, matchResult, belt }) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsLoading(true);
    setAnalysisError(null);
    setAnalysis(null);
    setProcessingStage('Iniciando análise...');
    setProcessingProgress(10);

    intervalRef.current = setInterval(() => {
      setProcessingProgress(prev => (prev >= 90 ? 90 : prev + 2));
    }, 1000);

    setProcessingStage('📥 Baixando vídeo...');
    await new Promise(resolve => setTimeout(resolve, 500));
    setProcessingProgress(20);

    setProcessingStage('⬆️  Enviando para Gemini...');
    await new Promise(resolve => setTimeout(resolve, 500));
    setProcessingProgress(30);

    setProcessingStage('⏳ Processando vídeo (pode levar 2-5 minutos)...');
    await new Promise(resolve => setTimeout(resolve, 500));
    setProcessingProgress(40);

    setProcessingStage('🤖 Gemini analisando o vídeo completo...');

    try {
      const result = await analyzeVideoLink({ videos, athleteName, personId, personType, matchResult, belt });

      clearInterval(intervalRef.current);
      setProcessingProgress(100);
      setProcessingStage('✅ Análise concluída!');

      if (result.data) {
        setAnalysis(result);
        if (personId) setLastSavedPersonId(personId);
      } else {
        setAnalysisError('Nenhum dado retornado da análise');
      }
    } catch (err) {
      clearInterval(intervalRef.current);
      const errorMsg =
        err.response?.data?.error || err.response?.data?.details || err.message || 'Erro ao analisar os vídeos. Tente novamente.';
      setAnalysisError(errorMsg);
      setProcessingStage('');
      setProcessingProgress(0);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setProcessingStage('');
        setProcessingProgress(0);
      }, 2000);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsLoading(false);
    setAnalysis(null);
    setLastSavedPersonId(null);
    setProcessingStage('');
    setProcessingProgress(0);
    setAnalysisError(null);
  }, []);

  return (
    <AnalysisProgressContext.Provider value={{
      isLoading,
      analysis,
      lastSavedPersonId,
      processingStage,
      processingProgress,
      analysisError,
      startAnalysis,
      clearAnalysis,
    }}>
      {children}
    </AnalysisProgressContext.Provider>
  );
}

export function useAnalysisProgress() {
  const ctx = useContext(AnalysisProgressContext);
  if (!ctx) throw new Error('useAnalysisProgress must be used within AnalysisProgressProvider');
  return ctx;
}
