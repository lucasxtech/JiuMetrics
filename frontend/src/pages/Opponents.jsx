// Página de Adversários - Similar a Athletes
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AthleteCard from '../components/common/AthleteCard';
import AthleteForm from '../components/forms/AthleteForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import Modal from '../components/common/Modal';
import { getAllOpponents } from '../services/opponentService';

export default function Opponents() {
  const navigate = useNavigate();
  const [opponents, setOpponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Carregar adversários da API
  useEffect(() => {
    loadOpponents();
  }, []);

  async function loadOpponents() {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllOpponents();
      setOpponents(response?.data || []);
    } catch {
      setError('Erro ao carregar adversários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const handleOpponentCreated = () => {
    setShowForm(false);
    loadOpponents();
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
          <p className="eyebrow">Planejamento</p>
          <h1 className="hero-title">Central de adversários</h1>
          <p className="hero-description">Reúna informações-chave de cada adversário para acelerar análises de vídeo e simulações de estratégia.</p>
        </div>
        <div className="hero-meta space-y-4">
          <p>Cadastre adversários antes das lutas para manter o dossiê sempre pronto para consulta.</p>
          <button
            style={{ marginTop: "2vh" }}
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-white hover:bg-slate-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
            {showForm ? 'Fechar formulário' : 'Novo adversário'}
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

      {/* Modal de Cadastro */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Cadastrar novo adversário"
        subtitle="Preencha os dados básicos; o perfil avançado pode ser gerado posteriormente com IA."
        size="lg"
      >
        <AthleteForm onSuccess={handleOpponentCreated} isOpponent />
      </Modal>

      {opponents.length > 0 && (
        <section className="panel">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Lista</p>
              <h2 className="panel__title">Todos os adversários ({opponents.length})</h2>
            </div>
            <span className="panel__meta">Abra um adversário para iniciar análises detalhadas e vídeos associados.</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {opponents.map((opponent) => (
              <AthleteCard
                key={opponent.id}
                {...opponent}
                type="opponent"
                onClick={() => navigate(`/opponents/${opponent.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {opponents.length === 0 && !error && (
        <section className="panel text-center">
          <div className="mx-auto max-w-md space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-4xl">🤼</div>
            <div>
              <h3 className="panel__title mb-2">Nenhum adversário cadastrado</h3>
              <p className="text-slate-600">Crie o primeiro registro para gerar relatórios comparativos e estratégias automatizadas.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-white hover:bg-slate-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
              </svg>
              Adicionar primeiro adversário
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
