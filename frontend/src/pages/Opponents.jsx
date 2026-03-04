// Página de Adversários - Similar a Athletes
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AthleteCard from '../components/common/AthleteCard';
import AthleteForm from '../components/forms/AthleteForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import Modal from '../components/common/Modal';
import { getAllOpponents } from '../services/opponentService';

export default function Opponents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // ✅ React Query: Cache automático de 5 minutos
  const { data: opponents = [], isLoading: loading, error } = useQuery({
    queryKey: ['opponents'],
    queryFn: async () => {
      const response = await getAllOpponents();
      return response?.data || [];
    },
  });

  const handleOpponentCreated = () => {
    setShowForm(false);
    // ✅ Invalidar cache para recarregar lista atualizada
    queryClient.invalidateQueries({ queryKey: ['opponents'] });
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
          message="Erro ao carregar adversários. Tente novamente." 
          onDismiss={() => queryClient.invalidateQueries({ queryKey: ['opponents'] })}
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
        <section className="panel !py-8 !px-6 md:!px-8">
          <div className="panel__head mb-8">
            <div>
              <p className="eyebrow">Lista</p>
              <h2 className="panel__title">Todos os adversários ({opponents.length})</h2>
            </div>
            <span className="panel__meta">Abra um adversário para iniciar análises detalhadas e vídeos associados.</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3 xl:gap-10">
            {opponents.map((opponent) => (
              <AthleteCard
                key={opponent.id}
                {...opponent}
                analysesCount={opponent.analysesCount || 0}
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
