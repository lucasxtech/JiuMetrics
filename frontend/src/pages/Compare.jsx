// Página de Comparação - Atleta X Adversário - Design Moderno
import { useState, useEffect } from 'react';
import CompareView from '../components/CompareView';
import { getAllAthletes } from '../services/athleteService';
import { getAllOpponents } from '../services/opponentService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

export default function Compare() {
  const [athletes, setAthletes] = useState([]);
  const [opponents, setOpponents] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Carregando atletas e adversários...');
      const [athletesResponse, opponentsResponse] = await Promise.all([
        getAllAthletes(),
        getAllOpponents()
      ]);
      console.log('Atletas:', athletesResponse);
      console.log('Adversários:', opponentsResponse);
      setAthletes(athletesResponse?.data || []);
      setOpponents(opponentsResponse?.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Erro ao carregar atletas e adversários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const selectionButtonBase =
    'w-full rounded-xl border px-4 py-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300';

  console.log('Compare render - Loading:', loading, 'Error:', error, 'Athletes:', athletes.length, 'Opponents:', opponents.length);

  if (loading) {
    return (
      <div className="dashboard-wrapper animate-fadeIn">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
            <p className="text-slate-600">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-wrapper animate-fadeIn">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800 mb-4">{error}</p>
              <button 
                onClick={loadData}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <p className="section-header__eyebrow" style={{ marginLeft: "1vw" }}>Seleção</p>
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
              {athletes.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum atleta cadastrado</p>
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
                      <p className="text-sm text-slate-500">{athlete.belt} • {athlete.style || 'Sem estilo'}</p>
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
                <h3 className="panel__title">Selecione o adversário</h3>
              </div>
            </div>
            <div className="space-y-3">
              {opponents.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhum adversário cadastrado</p>
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
                      <p className="text-sm text-slate-500">{opponent.belt} • {opponent.style || 'Sem estilo'}</p>
                    </button>
                  );
                })
              )}
            </div>
          </article>
        </div>
      </section>

      <section>
        <div className="section-header">
          <p className="section-header__eyebrow" style={{ marginLeft: "1vw" }}>Resultado</p>
          <h2 className="section-header__title" style={{ marginLeft: "1vw" }}>Visualize insights da comparação</h2>
        </div>
        <CompareView athlete={selectedAthlete} opponent={selectedOpponent} />
      </section>
    </div>
  );
}
