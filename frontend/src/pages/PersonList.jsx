// Lista de atletas OU adversários (spec 013). `Athletes.jsx` e
// `Opponents.jsx` eram a mesma página com textos e cores trocados.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AthleteCard from '../components/common/AthleteCard';
import AthleteCardSkeleton from '../components/common/AthleteCardSkeleton';
import ErrorMessage from '../components/common/ErrorMessage';
import Modal from '../components/common/Modal';
import PersonForm from '../components/forms/PersonForm';
import { usePersons, usePersonMutations } from '../hooks/usePersons';
import { usePersonFilters, SORT_OPTIONS } from '../hooks/usePersonFilters';
import { personLabels } from '../constants/persons';

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
  </svg>
);

export default function PersonList({ type }) {
  const labels = personLabels(type);
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const { data: people = [], isLoading, error, refetch } = usePersons(type);
  const { create } = usePersonMutations(type);
  const { search, setSearch, sort, setSort, visible } = usePersonFilters(people);

  const handleCreate = async (values) => {
    await create.mutateAsync(values);
    setShowForm(false);
  };

  return (
    <div className="dashboard-wrapper animate-fadeIn">
      <section className="panel panel--hero flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">{labels.eyebrow}</p>
          <h1 className="hero-title">{labels.title}</h1>
          <p className="hero-description">{labels.description}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-white hover:bg-slate-700"
        >
          <PlusIcon />
          Novo {labels.singular.toLowerCase()}
        </button>
      </section>

      {error && (
        <ErrorMessage
          message={`Erro ao carregar ${labels.plural.toLowerCase()}. Tente novamente.`}
          onDismiss={() => refetch()}
        />
      )}

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={`Cadastrar novo ${labels.singular.toLowerCase()}`}
        subtitle="Nome e faixa bastam; o perfil técnico vem das análises de vídeo."
        size="md"
      >
        <PersonForm type={type} onSubmit={handleCreate} />
      </Modal>

      {(isLoading || people.length > 0) && (
        <section className="panel !py-8 !px-6 md:!px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Lista</p>
              <h2 className="panel__title">
                {isLoading
                  ? `Carregando ${labels.plural.toLowerCase()}...`
                  : search
                    ? `${visible.length} de ${people.length}`
                    : `${labels.plural} (${people.length})`}
              </h2>
            </div>

            {!isLoading && people.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="person-search">
                  Buscar {labels.plural.toLowerCase()}
                </label>
                <input
                  id="person-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou faixa..."
                  className="w-56 rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                />
                <label className="sr-only" htmlFor="person-sort">
                  Ordenar
                </label>
                <select
                  id="person-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 xl:grid-cols-3 xl:gap-10">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <AthleteCardSkeleton key={i} />)
              : visible.map((person) => (
                  <AthleteCard
                    key={person.id}
                    name={person.name}
                    belt={person.belt}
                    analysesCount={person.analysesCount || 0}
                    creatorName={person.creatorName}
                    type={type}
                    onClick={() => navigate(`${labels.route}/${person.id}`)}
                  />
                ))}
          </div>

          {!isLoading && visible.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhum resultado para “{search}”.
            </p>
          )}
        </section>
      )}

      {people.length === 0 && !isLoading && !error && (
        <section className="panel text-center">
          <div className="mx-auto max-w-md space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="panel__title mb-2">Nenhum {labels.singular.toLowerCase()} cadastrado</h3>
              <p className="text-slate-600">Cadastre o primeiro para liberar análises de vídeo e estratégias.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-white hover:bg-slate-700"
            >
              <PlusIcon />
              Adicionar primeiro {labels.singular.toLowerCase()}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
