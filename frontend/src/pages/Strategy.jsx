// Página de Estratégia - Análise com IA - Design Moderno
import { useState, useEffect } from 'react';
import { getAllAthletes } from '../services/athleteService';
import { getAllOpponents } from '../services/opponentService';
import { compareAndGenerateStrategy } from '../services/strategyService';
import AiStrategyBox from '../components/AiStrategyBox';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

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

  const selectionButtonBase =
    'w-full rounded-xl border px-4 py-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300';

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
          <article className="panel">
            <div className="panel__head">
              <div>
                <p className="eyebrow">Atleta</p>
                <h3 className="panel__title">Seu atleta</h3>
              </div>
            </div>
            <div className="space-y-3">
              {athletes.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nenhum atleta cadastrado ainda
                </p>
              ) : (
                athletes.map((athlete) => {
                  const isSelected = selectedAthlete?.id === athlete.id;
                  return (
                    <button
                      key={athlete.id}
                      type="button"
                      onClick={() => setSelectedAthlete(athlete)}
                      className={`${selectionButtonBase} ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900/5 text-slate-900'
                          : 'border-transparent bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <p className="font-semibold text-slate-900">{athlete.name}</p>
                      <p className="text-sm text-slate-500">
                        {athlete.belt || 'N/A'} • {athlete.weight || 'N/A'}kg
                        {athlete.cardio ? ` • Cond: ${athlete.cardio}%` : ''}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </article>

          <article className="panel">
            <div className="panel__head">
              <div>
                <p className="eyebrow">Adversário</p>
                <h3 className="panel__title">Alvo da estratégia</h3>
              </div>
            </div>
            <div className="space-y-3">
              {opponents.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nenhum adversário cadastrado ainda
                </p>
              ) : (
                opponents.map((opponent) => {
                  const isSelected = selectedOpponent?.id === opponent.id;
                  return (
                    <button
                      key={opponent.id}
                      type="button"
                      onClick={() => setSelectedOpponent(opponent)}
                      className={`${selectionButtonBase} ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900/5 text-slate-900'
                          : 'border-transparent bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <p className="font-semibold text-slate-900">{opponent.name}</p>
                      <p className="text-sm text-slate-500">
                        {opponent.belt || 'N/A'} • {opponent.style || 'N/A'} • {opponent.weight ? `${opponent.weight}kg` : 'N/A'}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
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
        <section className="panel text-center">
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

