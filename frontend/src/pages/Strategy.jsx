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

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto px-4">
      {/* Hero Header */}
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 flex items-center justify-center gap-3">
          <span className="text-3xl md:text-4xl">🎯</span>
          Estratégia de Luta com IA
        </h1>
        <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">Analise dados e receba recomendações personalizadas baseadas em inteligência artificial</p>
      </div>

      {/* Seleção */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Atleta */}
        <div className="card-modern p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Seu Atleta</h2>
          </div>
          <div className="space-y-3">
            {athletes.map((athlete) => (
              <button
                key={athlete.id}
                onClick={() => setSelectedAthlete(athlete)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedAthlete?.id === athlete.id
                    ? 'bg-blue-50 border-blue-500 shadow-md'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow'
                }`}
              >
                <p className="font-bold text-gray-900 mb-1">{athlete.name}</p>
                <p className="text-sm text-gray-600">{athlete.belt} • {athlete.style} • Cond: {athlete.cardio}%</p>
              </button>
            ))}
          </div>
        </div>

        {/* Adversário */}
        <div className="card-modern p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v2h8v-2zM2 8a2 2 0 11-4 0 2 2 0 014 0zM8 15a4 4 0 00-8 0v2h8v-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Adversário</h2>
          </div>
          <div className="space-y-3">
            {opponents.map((opponent) => (
              <button
                key={opponent.id}
                onClick={() => setSelectedOpponent(opponent)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  selectedOpponent?.id === opponent.id
                    ? 'bg-orange-50 border-orange-500 shadow-md'
                    : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow'
                }`}
              >
                <p className="font-bold text-gray-900 mb-1">{opponent.name}</p>
                <p className="text-sm text-gray-600">{opponent.belt} • {opponent.style} • Cond: {opponent.cardio}%</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Botão de Gerar Estratégia */}
      <div className="text-center">
        <button
          onClick={handleGenerateStrategy}
          disabled={isLoading || !selectedAthlete || !selectedOpponent}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base md:text-lg shadow-xl transition-all ${
            isLoading || !selectedAthlete || !selectedOpponent
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-2xl hover:scale-105'
          }`}
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {isLoading ? 'Gerando Estratégia...' : 'Gerar Estratégia de Luta'}
        </button>
      </div>

      {/* Resultado */}
      {(strategy || isLoading) && (
        <AiStrategyBox strategy={strategy} isLoading={isLoading} />
      )}

      {/* Placeholder quando não há seleção */}
      {!strategy && !isLoading && !selectedAthlete && (
        <div className="card-modern p-12 text-center bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Pronto para uma Estratégia?</h3>
            <p className="text-gray-600 mb-6">Selecione seu atleta e um adversário acima para gerar uma estratégia personalizada com análise de IA.</p>
            <p className="text-sm text-gray-500">A estratégia considerará os atributos, estilos de luta e histórico dos competidores.</p>
          </div>
        </div>
      )}
    </div>
  );
}

