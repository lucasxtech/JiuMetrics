// Página de Comparação - Atleta X Adversário - Design Moderno
import { useState } from 'react';
import CompareView from '../components/CompareView';

export default function Compare() {
  const [athletes] = useState([
    { id: 1, name: 'João Silva', age: 28, weight: 85, belt: 'Roxa', style: 'Guarda', cardio: 85 },
    { id: 2, name: 'Maria Santos', age: 26, weight: 62, belt: 'Azul', style: 'Passagem', cardio: 75 },
  ]);

  const [opponents] = useState([
    { id: 1, name: 'Pedro Ramos', age: 30, weight: 90, belt: 'Marrom', style: 'Pressão', cardio: 80 },
    { id: 2, name: 'Ana Costa', age: 27, weight: 65, belt: 'Roxa', style: 'Explosão', cardio: 90 },
  ]);

  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState(null);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 flex items-center justify-center gap-4">
          <span className="text-4xl">📊</span>
          Comparador de Estratégias
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">Analise a diferença entre você e seu adversário</p>
      </div>

      {/* Seleção de Atleta e Adversário */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Seleção de Atleta */}
        <div className="card-modern p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Selecione o Atleta</h2>
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
                <p className="text-sm text-gray-600">{athlete.belt} • {athlete.style}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Seleção de Adversário */}
        <div className="card-modern p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v2h8v-2zM2 8a2 2 0 11-4 0 2 2 0 014 0zM8 15a4 4 0 00-8 0v2h8v-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Selecione o Adversário</h2>
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
                <p className="text-sm text-gray-600">{opponent.belt} • {opponent.style}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparação */}
      <CompareView
        athlete={selectedAthlete}
        opponent={selectedOpponent}
      />
    </div>
  );
}
