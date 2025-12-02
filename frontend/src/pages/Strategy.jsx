// Página de Estratégia - Análise com IA - Design Moderno
import { useState } from 'react';
import AiStrategyBox from '../components/AiStrategyBox';

export default function Strategy() {
  const [athletes] = useState([
    { id: 1, name: 'João Silva', age: 28, weight: 85, belt: 'Roxa', style: 'Guarda', cardio: 85 },
  ]);

  const [opponents] = useState([
    { id: 1, name: 'Pedro Ramos', age: 30, weight: 90, belt: 'Marrom', style: 'Pressão', cardio: 80 },
  ]);

  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Gera estratégia chamando a API
   */
  const handleGenerateStrategy = async () => {
    if (!selectedAthlete || !selectedOpponent) {
      alert('Selecione um atleta e um adversário');
      return;
    }

    setIsLoading(true);
    setStrategy(null);

    try {
      const response = await fetch('/api/ai/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athlete: selectedAthlete,
          opponent: selectedOpponent,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar estratégia');
      }

      const data = await response.json();
      setStrategy(data.data);
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao gerar estratégia. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectionButtonBase =
    'w-full rounded-xl border px-4 py-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300';

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

      <section>
        <div className="section-header">
          <p className="section-header__eyebrow" style={{ marginLeft: "1vw" }}>Seleção</p>
          <h2 className="section-header__title" style={{ marginLeft: "1vw" }}>Defina quem será analisado</h2>
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
              {athletes.map((athlete) => {
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
                    <p className="text-sm text-slate-500">{athlete.belt} • {athlete.style} • Cond: {athlete.cardio}%</p>
                  </button>
                );
              })}
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
              {opponents.map((opponent) => {
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
                    <p className="text-sm text-slate-500">{opponent.belt} • {opponent.style} • Cond: {opponent.cardio}%</p>
                  </button>
                );
              })}
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
          <div className="mx-auto max-w-md space-y-4">
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

