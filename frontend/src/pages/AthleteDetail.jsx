// Página de Detalhe do Atleta
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import StatsRadarChart from '../components/charts/StatsRadarChart';
import StatsBarChart from '../components/charts/StatsBarChart';

export default function AthleteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Dados do atleta carregados do armazenamento
  const [athlete] = useState({
    id,
    name: 'João Silva',
    age: 28,
    weight: 85,
    belt: 'Roxa',
    style: 'Guarda',
    strongAttacks: 'Raspagem, Armlock, Estrangulação',
    weaknesses: 'Defesa de queda, Movimentação rápida',
    cardio: 85,
    videoUrl: 'https://youtube.com/...',
  });

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

  if (!athlete) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Atleta não encontrado</p>
        <button
          onClick={() => navigate('/athletes')}
          className="mt-4 bg-secondary text-white px-4 py-2 rounded-lg"
        >
          Voltar para Atletas
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
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
        <div className="flex space-x-2">
          <button className="bg-secondary text-white px-4 py-2 rounded-lg hover:opacity-90">
            Editar
          </button>
          <button className="bg-red-500 text-white px-4 py-2 rounded-lg hover:opacity-90">
            Deletar
          </button>
        </div>
      </div>

      {/* Informações Básicas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Idade</p>
          <p className="text-2xl font-bold text-primary">{athlete.age}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Peso</p>
          <p className="text-2xl font-bold text-primary">{athlete.weight} kg</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Faixa</p>
          <p className="text-2xl font-bold text-secondary">{athlete.belt}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-gray-600 text-sm">Condicionamento</p>
          <p className="text-2xl font-bold text-accent">{athlete.cardio}%</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatsRadarChart
          data={athleteRadarData}
          title="Perfil de Atributos"
        />
        <StatsBarChart
          data={attacksData}
          title="Golpes Mais Utilizados"
        />
      </div>

      {/* Informações Detalhadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-primary mb-4">Golpes Fortes</h3>
          <p className="text-gray-700">{athlete.strongAttacks}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-primary mb-4">Pontos Fracos</h3>
          <p className="text-gray-700">{athlete.weaknesses}</p>
        </div>
      </div>

      {/* Vídeos */}
      {athlete.videoUrl && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-primary mb-4">Vídeos de Referência</h3>
          <a
            href={athlete.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary hover:text-blue-700 underline"
          >
            {athlete.videoUrl}
          </a>
        </div>
      )}
    </div>
  );
}
