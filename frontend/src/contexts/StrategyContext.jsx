import { createContext, useContext, useState, useCallback } from 'react';
import { compareAndGenerateStrategy } from '../services/strategyService';

const StrategyContext = createContext(null);

export function StrategyProvider({ children }) {
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [strategyError, setStrategyError] = useState(null);

  const generateStrategy = useCallback(async (athlete, opponent) => {
    if (!athlete || !opponent) return;
    setIsLoading(true);
    setStrategy(null);
    setStrategyError(null);

    try {
      const response = await compareAndGenerateStrategy(athlete.id, opponent.id);
      setStrategy(response.data);
    } catch (err) {
      console.error('❌ Erro ao gerar estratégia:', err);
      setStrategyError(err.message || 'Erro ao gerar estratégia. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStrategy = useCallback((suggestion) => {
    if (!suggestion) return;
    setStrategy(prev => {
      const current = prev?.strategy || prev || {};
      let updated = { ...current };

      if (suggestion.section === 'tese_da_vitoria') {
        updated.tese_da_vitoria = suggestion.newValue;
      } else if (suggestion.section === 'analise_de_matchup') {
        updated.analise_de_matchup = { ...updated.analise_de_matchup, ...suggestion.newValue };
      } else if (suggestion.section === 'plano_tatico_faseado') {
        updated.plano_tatico_faseado = { ...updated.plano_tatico_faseado, ...suggestion.newValue };
      } else if (suggestion.section === 'pontos_criticos') {
        updated.pontos_criticos = suggestion.newValue;
      } else if (suggestion.section === 'dicas_especificas') {
        updated.dicas_especificas = suggestion.newValue;
      } else {
        updated[suggestion.section || suggestion.field] = suggestion.newValue;
      }

      return { strategy: updated };
    });
  }, []);

  const clearStrategy = useCallback(() => {
    setStrategy(null);
    setStrategyError(null);
    setSelectedAthlete(null);
    setSelectedOpponent(null);
  }, []);

  return (
    <StrategyContext.Provider value={{
      selectedAthlete, setSelectedAthlete,
      selectedOpponent, setSelectedOpponent,
      strategy,
      isLoading,
      strategyError,
      generateStrategy,
      updateStrategy,
      clearStrategy,
    }}>
      {children}
    </StrategyContext.Provider>
  );
}

export function useStrategy() {
  const ctx = useContext(StrategyContext);
  if (!ctx) throw new Error('useStrategy must be used within StrategyProvider');
  return ctx;
}
