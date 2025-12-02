// Página de Detalhe do Atleta
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatsRadarChart from '../components/charts/StatsRadarChart';
import StatsBarChart from '../components/charts/StatsBarChart';
import AthleteForm from '../components/forms/AthleteForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getAthleteById, deleteAthlete } from '../services/athleteService';
import { getAnalysesByPerson, deleteAnalysis } from '../services/fightAnalysisService';

export default function AthleteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    async function fetchAthlete() {
      try {
        setLoading(true);
        setError(null);
        const response = await getAthleteById(id);
        setAthlete(response?.data ?? null);
        
        // Buscar análises do atleta
        try {
          const analysesResponse = await getAnalysesByPerson(id);
          setAnalyses(analysesResponse?.data ?? []);
        } catch (analysisErr) {
          console.error('Erro ao carregar análises:', analysisErr);
          setAnalyses([]);
        }
      } catch (err) {
        console.error('Erro ao carregar atleta:', err);
        setError('Não foi possível carregar o atleta.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchAthlete();
    }
  }, [id]);

  const handleDelete = () => {
    if (!athlete) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAthlete(athlete.id);
      navigate('/athletes');
    } catch (err) {
      console.error('Erro ao deletar atleta:', err);
      setError('Erro ao deletar atleta. Tente novamente.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleUpdated = (updatedAthlete) => {
    setAthlete(updatedAthlete);
    setIsEditing(false);
  };

  const athleteRadarData = [
    { name: 'Condicionamento', value: 85 },
    { name: 'Técnica', value: 75 },
    { name: 'Agressividade', value: 70 },
    { name: 'Defesa', value: 80 },
    { name: 'Movimentação', value: 75 },
  ];

  const attacksData = [
    { name: 'Raspagem', value: 28 },
    { name: 'Armlock', value: 22 },
    { name: 'Estrangulação', value: 18 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !athlete) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <ErrorMessage message={error || 'Atleta não encontrado.'} />
        <button
          type="button"
          onClick={() => navigate('/athletes')}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-white shadow-sm hover:bg-slate-700"
        >
          Voltar para Atletas
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            onClick={() => navigate('/athletes')}
            className="text-secondary hover:text-blue-700 mb-2 flex items-center"
          >
            ← Voltar
          </button>
          <h1 className="text-3xl font-bold text-primary">{athlete.name}</h1>
          <p className="text-gray-600 mt-1">{athlete.belt} • {athlete.style}</p>
        </div>
        <div className="flex gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className={`inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg ${
              isEditing ? 'ring-2 ring-indigo-400' : ''
            }`}
          >
            {isEditing ? 'Cancelar edição' : 'Editar'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-600"
          >
            Deletar
          </button>
        </div>
      </div>

      {isEditing && (
        <section className="panel">
          <div className="panel__head mb-6">
            <div>
              <p className="eyebrow">Edição</p>
              <h3 className="panel__title">Atualizar dados do atleta</h3>
            </div>
            <p className="panel__meta">Os dados atuais permanecem visíveis abaixo para referência.</p>
          </div>
          <AthleteForm initialData={athlete} onSuccess={handleUpdated} />
        </section>
      )}

      {/* Informações Básicas */}
      <section className={`panel ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="panel__head mb-4">
          <div>
            <p className="eyebrow">Perfil geral</p>
            <h3 className="panel__title">Informações principais</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[{
            label: 'Idade',
            value: `${athlete.age} anos`,
            accent: 'text-primary'
          }, {
            label: 'Peso',
            value: `${athlete.weight} kg`,
            accent: 'text-primary'
          }, {
            label: 'Faixa',
            value: athlete.belt,
            accent: 'text-secondary'
          }, {
            label: 'Condicionamento',
            value: `${athlete.cardio}%`,
            accent: 'text-accent'
          }].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl bg-white px-6 py-8 sm:px-8 sm:py-9 text-center shadow-[0_15px_35px_rgba(15,23,42,0.08)]"
            >
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className={`mt-3 text-3xl font-bold text-slate-900 ${item.accent}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Análises de Vídeo com IA */}
      {analyses.length > 0 && (
        <section className={`panel ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="panel__head mb-4">
            <div>
              <p className="eyebrow">Inteligência Artificial</p>
              <h3 className="panel__title">Análises de vídeo ({analyses.length})</h3>
            </div>
          </div>
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <div 
                key={analysis.id} 
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 hover:border-blue-200 hover:bg-blue-50/50 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-slate-600">
                        {new Date(analysis.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                      {analysis.framesAnalyzed && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {analysis.framesAnalyzed} frames
                        </span>
                      )}
                    </div>
                    {analysis.summary && (
                      <p className="text-sm text-slate-700 line-clamp-2">{analysis.summary}</p>
                    )}
                    {analysis.videoUrl && (
                      <p className="mt-1 text-xs text-slate-500 truncate">{analysis.videoUrl}</p>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm('Deseja remover esta análise?')) {
                        try {
                          await deleteAnalysis(analysis.id);
                          setAnalyses(analyses.filter(a => a.id !== analysis.id));
                        } catch (err) {
                          console.error('Erro ao deletar análise:', err);
                        }
                      }
                    }}
                    className="text-xs text-slate-400 hover:text-red-600 transition cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
                {analysis.charts && analysis.charts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {analysis.charts.slice(0, 3).map((chart, idx) => (
                      <span 
                        key={idx}
                        className="rounded-md bg-white border border-slate-200 px-2 py-1 text-xs text-slate-600"
                      >
                        {chart.title || `Gráfico ${idx + 1}`}
                      </span>
                    ))}
                    {analysis.charts.length > 3 && (
                      <span className="rounded-md bg-white border border-slate-200 px-2 py-1 text-xs text-slate-500">
                        +{analysis.charts.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gráficos */}
      <div className={`grid grid-cols-1 gap-6 lg:grid-cols-2 ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
        <section className="panel">
          <div className="panel__head mb-4">
            <div>
              <p className="eyebrow">Perfil</p>
              <h3 className="panel__title">Perfil de atributos</h3>
            </div>
          </div>
          <div className="chart-area">
            <StatsRadarChart data={athleteRadarData} />
          </div>
        </section>
        <section className="panel">
          <div className="panel__head mb-4">
            <div>
              <p className="eyebrow">Análise ofensiva</p>
              <h3 className="panel__title">Golpes mais utilizados</h3>
            </div>
          </div>
          <div className="chart-area">
            <StatsBarChart data={attacksData} />
          </div>
        </section>
      </div>

      {/* Informações Detalhadas */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[{
          title: 'Golpes Fortes',
          description: athlete.strongAttacks
        }, {
          title: 'Pontos Fracos',
          description: athlete.weaknesses,
          accent: 'text-amber-600'
        }].map((block) => (
          <section
            key={block.title}
            className={`panel ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <div className="panel__head mb-3">
              <p className="panel__title text-xl">{block.title}</p>
            </div>
            <p className={`text-lg text-slate-700 leading-relaxed ${block.accent || ''}`}>
              {block.description || 'Sem registro'}
            </p>
          </section>
        ))}
      </div>

      {/* Vídeos */}
      {athlete.videoUrl && (
        <section className={`panel ${isEditing ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="panel__head mb-4">
            <p className="eyebrow">Referências</p>
            <h3 className="panel__title">Vídeos de referência</h3>
          </div>
          <a
            href={athlete.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-indigo-600 underline decoration-dotted hover:text-indigo-700"
          >
            {athlete.videoUrl}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </section>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-red-500">Atenção</p>
                <h3 className="text-lg font-semibold text-slate-900">Excluir atleta</h3>
              </div>
            </div>
            <p className="text-slate-600 mb-6">Essa ação é permanente e removerá todos os dados do atleta <strong>{athlete.name}</strong>. Deseja continuar?</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-600 disabled:opacity-60"
              >
                {isDeleting ? 'Removendo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
