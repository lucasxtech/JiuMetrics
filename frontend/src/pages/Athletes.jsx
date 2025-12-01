// Página de Atletas - Lista e gerenciamento
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AthleteCard from '../components/common/AthleteCard';
import AthleteForm from '../components/forms/AthleteForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getAllAthletes, deleteAthlete } from '../services/athleteService';

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
    <div className="space-y-6 animate-fadeIn max-w-6xl mx-auto px-4">
      {/* Cabeçalho Moderno */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <span className="text-4xl md:text-5xl">🥋</span>
            Atletas
          </h1>
          <p className="text-slate-600 text-base md:text-lg">Gerencie e acompanhe o desempenho dos seus atletas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 text-base md:text-lg"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Novo Atleta</span>
        </button>
      </div>

      {/* Erro */}
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)}
        />
      )}

      {/* Formulário (colapsável) */}
      {showForm && (
        <div className="card-modern p-6 md:p-8 animate-scaleIn">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Cadastrar Novo Atleta</h3>
              <p className="text-sm text-slate-600 mt-1">Preencha os dados básicos. O perfil técnico será gerado pela IA.</p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <AthleteForm onSuccess={handleAthleteCreated} />
        </div>
      )}

      {/* Grid de Atletas */}
      {athletes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Todos os Atletas ({athletes.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {athletes.map((athlete) => (
              <AthleteCard
                key={athlete.id}
                {...athlete}
                type="athlete"
                onClick={() => navigate(`/athletes/${athlete.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {athletes.length === 0 && !error && (
        <div className="card-modern p-12 md:p-16 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center">
              <span className="text-5xl">🥋</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Nenhum atleta cadastrado</h3>
            <p className="text-slate-600 text-lg mb-8">Comece adicionando seu primeiro atleta e faça a análise técnica com IA</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Adicionar Primeiro Atleta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
