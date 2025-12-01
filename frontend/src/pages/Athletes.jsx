// Página de Atletas - Lista e gerenciamento
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AthleteCard from '../components/common/AthleteCard';
import AthleteForm from '../components/forms/AthleteForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getAllAthletes } from '../services/athleteService';

export default function Athletes() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Carregar atletas da API
  useEffect(() => {
    loadAthletes();
  }, []);

  async function loadAthletes() {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllAthletes();
      // A API retorna { success: true, data: [...] }
      setAthletes(response?.data || []);
    } catch (err) {
      console.error('Erro ao carregar atletas:', err);
      setError('Erro ao carregar atletas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const handleAthleteCreated = () => {
    setShowForm(false);
    loadAthletes();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper animate-fadeIn">
      <section className="panel panel--hero">
        <div>
          <p className="eyebrow">Gestão</p>
          <h1 className="hero-title">Central de atletas</h1>
          <p className="hero-description">Gerencie perfis, acompanhe métricas e mantenha os cadastros sincronizados antes das análises.</p>
        </div>
        <div className="hero-meta space-y-4">
          <p>Crie novos perfis e mantenha as informações prontas para as comparações e estratégias.</p>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-white hover:bg-slate-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
            {showForm ? 'Fechar formulário' : 'Novo atleta'}
          </button>
        </div>
      </section>

      {/* Erro */}
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)}
        />
      )}

      {/* Formulário (colapsável) */}
      {showForm && (
        <section className="panel animate-scaleIn">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Cadastro</p>
              <h3 className="panel__title">Cadastrar novo atleta</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
              </svg>
              Fechar
            </button>
          </div>
          <p className="panel__meta mb-6">Preencha os dados básicos; o perfil avançado pode ser gerado posteriormente com IA.</p>
          <AthleteForm onSuccess={handleAthleteCreated} />
        </section>
      )}

      {athletes.length > 0 && (
        <section className="panel">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Lista</p>
              <h2 className="panel__title">Todos os atletas ({athletes.length})</h2>
            </div>
            <span className="panel__meta">Selecione um atleta para abrir a visão detalhada.</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {athletes.map((athlete) => (
              <AthleteCard
                key={athlete.id}
                {...athlete}
                type="athlete"
                onClick={() => navigate(`/athletes/${athlete.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {athletes.length === 0 && !error && (
        <section className="panel text-center">
          <div className="mx-auto max-w-md space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-4xl">🥋</div>
            <div>
              <h3 className="panel__title mb-2">Nenhum atleta cadastrado</h3>
              <p className="text-slate-600">Cadastre o primeiro atleta para liberar análises detalhadas e comparações.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-white hover:bg-slate-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
              </svg>
              Adicionar primeiro atleta
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
