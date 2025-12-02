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

  const selectionButtonBase =
    'w-full rounded-xl border px-4 py-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300';

  return (
    <div className="dashboard-wrapper animate-fadeIn">
      <section className="panel panel--hero">
        <div>
          <p className="eyebrow">Comparação</p>
          <h1 className="hero-title">Comparador de estratégias</h1>
          <p className="hero-description">Selecione um atleta e um adversário para comparar atributos e identificar oportunidades táticas.</p>
        </div>
        <div className="hero-meta">
          <p>Use esta tela antes de gerar estratégias ou análises de vídeo para validar diferencias marcantes.</p>
        </div>
      </section>

      <section>
        <div className="section-header">
          <p className="section-header__eyebrow"style={{ marginLeft: "1vw" }}>Seleção</p>
          <h2 className="section-header__title" style={{ marginLeft: "1vw" }}>Escolha os perfis para comparar</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <article className="panel">
            <div className="panel__head">
              <div>
                <p className="eyebrow">Atleta</p>
                <h3 className="panel__title">Selecione o atleta</h3>
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
                    <p className="text-sm text-slate-500">{athlete.belt} • {athlete.style}</p>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="panel">
            <div className="panel__head">
              <div>
                <p className="eyebrow">Adversário</p>
                <h3 className="panel__title">Selecione o adversário</h3>
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
                    <p className="text-sm text-slate-500">{opponent.belt} • {opponent.style}</p>
                  </button>
                );
              })}
            </div>
          </article>
        </div>
      </section>

      <section>
        <div className="section-header">
          <p className="section-header__eyebrow">Resultado</p>
          <h2 className="section-header__title">Visualize insights da comparação</h2>
        </div>
        <CompareView athlete={selectedAthlete} opponent={selectedOpponent} />
      </section>
    </div>
  );
}
