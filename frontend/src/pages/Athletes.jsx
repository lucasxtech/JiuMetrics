// Página de Atletas - Lista e gerenciamento
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AthleteCard from '../components/common/AthleteCard';
import AthleteForm from '../components/forms/AthleteForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import Modal from '../components/common/Modal';
import { getAllAthletes } from '../services/athleteService';

export default function Athletes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // ✅ React Query: Cache automático de 5 minutos
  // Navegação repetida para esta página será instantânea!
  const { data: athletes = [], isLoading: loading, error } = useQuery({
    queryKey: ['athletes'],
    queryFn: async () => {
      const response = await getAllAthletes();
      return response?.data || [];
    },
  });

  const handleAthleteCreated = () => {
    setShowForm(false);
    // ✅ Invalidar cache para recarregar lista atualizada
    queryClient.invalidateQueries({ queryKey: ['athletes'] });
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
      <section className="panel panel--hero flex justify-between items-center">
        <div>
          <p className="eyebrow">Gestão</p>
          <h1 className="hero-title">Central de atletas</h1>
          <p className="hero-description">Gerencie perfis, acompanhe métricas e mantenha os cadastros sincronizados antes das análises.</p>
        </div>
        <div className="hero-meta space-y-4">
          <p className="mb-4">Crie novos perfis e mantenha as informações prontas para as comparações e estratégias.</p>
          <button
            style={{ marginTop: "2vh" }}
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
          message="Erro ao carregar atletas. Tente novamente." 
          onDismiss={() => queryClient.invalidateQueries({ queryKey: ['athletes'] })}
        />
      )}

      {/* Modal de Cadastro */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Cadastrar novo atleta"
        subtitle="Preencha os dados básicos; o perfil avançado pode ser gerado posteriormente com IA."
        size="lg"
      >
        <AthleteForm onSuccess={handleAthleteCreated} />
      </Modal>

      {athletes.length > 0 && (
        <section className="panel !py-8 !px-6 md:!px-8">
          <div className="panel__head mb-8">
            <div>
              <p className="eyebrow">Lista</p>
              <h2 className="panel__title">Todos os atletas ({athletes.length})</h2>
            </div>
            <span className="panel__meta">Selecione um atleta para abrir a visão detalhada.</span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3 xl:gap-10">
            {athletes.map((athlete) => (
              <AthleteCard
                key={athlete.id}
                {...athlete}
                analysesCount={athlete.analysesCount || 0}
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
