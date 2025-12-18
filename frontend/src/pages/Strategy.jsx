// Página de Estratégia - Análise com IA - Design Moderno
import { useState, useEffect } from 'react';
import { getAllAthletes } from '../services/athleteService';
import { getAllOpponents } from '../services/opponentService';
import { compareAndGenerateStrategy } from '../services/strategyService';
import AiStrategyBox from '../components/AiStrategyBox';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import CustomSelect from '../components/common/CustomSelect';

export default function Strategy() {
  const [athletes, setAthletes] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState(null);

  // Carregar atletas e adversários ao montar
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingData(true);
        setError(null);
        
        const [athletesData, opponentsData] = await Promise.all([
          getAllAthletes(),
          getAllOpponents()
        ]);

        setAthletes(athletesData.data || []);
        setOpponents(opponentsData.data || []);
      } catch (err) {
        console.error('❌ Erro ao carregar dados:', err);
        setError('Erro ao carregar atletas e adversários');
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  }, []);

  const handleGenerateStrategy = async () => {
    if (!selectedAthlete || !selectedOpponent) {
      alert('Selecione um atleta e um adversário');
      return;
    }

    setIsLoading(true);
    setStrategy(null);
    setError(null);

    try {
      const response = await compareAndGenerateStrategy(
        selectedAthlete.id,
        selectedOpponent.id
      );

      setStrategy(response.data);
    } catch (err) {
      console.error('❌ Erro ao gerar estratégia:', err);
      setError(err.message || 'Erro ao gerar estratégia. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="dashboard-wrapper">
        <LoadingSpinner message="Carregando atletas e adversários..." />
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper animate-fadeIn">
      <section className="panel panel--hero">
        <div>
          <p className="eyebrow">Estratégia</p>
          <h1 className="hero-title">Estratégia de luta com IA</h1>
          <p className="hero-description">Selecione um atleta e um adversário para gerar recomendações táticas antes do próximo confronto.</p>
        </div>
        <div className="hero-meta">
          <p>O motor de IA usa dados históricos e atributos para montar pontos de exploração e cuidados.</p>
        </div>
      </section>

      {error && <ErrorMessage message={error} />}

      <section>
        <div className="section-header">
          <p className="section-header__eyebrow">Seleção</p>
          <h2 className="section-header__title">Defina quem será analisado</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Atleta */}
          <article className="panel">
            <div className="panel__head mb-4">
              <div>
                <p className="eyebrow">Atleta</p>
                <h3 className="panel__title">Seu atleta</h3>
              </div>
            </div>
            
            {athletes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Nenhum atleta cadastrado ainda
              </p>
            ) : (
              <div className="space-y-4">
                <CustomSelect
                  value={selectedAthlete?.id || ''}
                  onChange={(athleteId) => {
                    const athlete = athletes.find(a => a.id === athleteId);
                    setSelectedAthlete(athlete || null);
                  }}
                  options={athletes.map(athlete => ({
                    value: athlete.id,
                    label: athlete.name,
                    subtitle: `${athlete.belt || 'N/A'} • ${athlete.weight || 'N/A'}kg${athlete.cardio ? ` • Cond: ${athlete.cardio}%` : ''}`
                  }))}
                  placeholder="Selecione um atleta"
                />
                
                {/* Preview card do atleta selecionado */}
                {selectedAthlete && (
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-600/30">
                        {selectedAthlete.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{selectedAthlete.name}</p>
                        <p className="text-sm text-slate-600">
                          {selectedAthlete.belt || 'N/A'} • {selectedAthlete.weight || 'N/A'}kg
                          {selectedAthlete.cardio ? ` • Condicionamento: ${selectedAthlete.cardio}%` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>

          {/* Adversário */}
          <article className="panel">
            <div className="panel__head mb-4">
              <div>
                <p className="eyebrow">Adversário</p>
                <h3 className="panel__title">Alvo da estratégia</h3>
              </div>
            </div>
            
            {opponents.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Nenhum adversário cadastrado ainda
              </p>
            ) : (
              <div className="space-y-4">
                <CustomSelect
                  value={selectedOpponent?.id || ''}
                  onChange={(opponentId) => {
                    const opponent = opponents.find(o => o.id === opponentId);
                    setSelectedOpponent(opponent || null);
                  }}
                  options={opponents.map(opponent => ({
                    value: opponent.id,
                    label: opponent.name,
                    subtitle: `${opponent.belt || 'N/A'} • ${opponent.style || 'N/A'} • ${opponent.weight ? `${opponent.weight}kg` : 'N/A'}`
                  }))}
                  placeholder="Selecione um adversário"
                />
                
                {/* Preview card do adversário selecionado */}
                {selectedOpponent && (
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-red-50 to-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 text-white font-bold text-lg shadow-lg shadow-red-600/30">
                        {selectedOpponent.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{selectedOpponent.name}</p>
                        <p className="text-sm text-slate-600">
                          {selectedOpponent.belt || 'N/A'} • {selectedOpponent.style || 'N/A'} • {selectedOpponent.weight ? `${selectedOpponent.weight}kg` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="panel__title">Gerar estratégia</h2>
          <p className="text-slate-600">Combine os perfis selecionados e deixe a IA sugerir pontos de atenção.</p>
          <button
            type="button"
            onClick={handleGenerateStrategy}
            disabled={isLoading || !selectedAthlete || !selectedOpponent}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {isLoading ? 'Gerando estratégia...' : 'Gerar estratégia de luta'}
          </button>
        </div>
      </section>

      {(strategy || isLoading) && <AiStrategyBox strategy={strategy} isLoading={isLoading} />}

      {!strategy && !isLoading && !selectedAthlete && (
        <section className="panel text-center" style={{ display: "flex", justifyContent: "center" }}>
          <div className="mx-auto max-w-md space-y-4 flex flex-col items-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
              <svg className="h-10 w-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="panel__title">Pronto para gerar uma estratégia?</h3>
            <p className="text-slate-600">Selecione um atleta e um adversário acima para liberar as recomendações inteligentes.</p>
            <p className="text-sm text-slate-500">A saída considera atributos, estilos e histórico recente.</p>
          </div>
        </section>
      )}
    </div>
  );
}

