// Componente de comparação entre atleta e adversário - Design Moderno
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function CompareView({ athlete, opponent }) {
  if (!athlete || !opponent) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card-modern p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhuma Comparação Selecionada</h3>
          <p className="text-gray-500 max-w-md mx-auto">Selecione um atleta e um adversário para visualizar a análise comparativa detalhada</p>
        </div>
      </div>
    );
  }

  // Preparar dados para o gráfico radar duplo
  const comparisonData = [
    {
      name: 'Condicionamento',
      [athlete.name]: athlete.cardio || 0,
      [opponent.name]: opponent.cardio || 0,
    },
    {
      name: 'Técnica',
      [athlete.name]: 75,
      [opponent.name]: 65,
    },
    {
      name: 'Agressividade',
      [athlete.name]: 70,
      [opponent.name]: 80,
    },
    {
      name: 'Defesa',
      [athlete.name]: 80,
      [opponent.name]: 70,
    },
    {
      name: 'Movimentação',
      [athlete.name]: 75,
      [opponent.name]: 70,
    },
  ];

  const ageDiff = Math.abs(athlete.age - opponent.age);
  const weightDiff = Math.abs(athlete.weight - opponent.weight);
  const cardioDiff = Math.abs(athlete.cardio - opponent.cardio);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn px-4">
      {/* Header com VS */}
      <div className="card-modern p-6 md:p-8 bg-gradient-to-r from-blue-50 via-white to-orange-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Atleta */}
          <div className="text-center md:text-right">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold mb-3 shadow-lg">
              {athlete.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{athlete.name}</h2>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              {athlete.belt}
            </div>
          </div>

          {/* VS Badge */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform">
                <span className="text-white text-3xl font-black">VS</span>
              </div>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-white rounded-full shadow-md">
                <span className="text-xs font-bold text-gray-600">MATCHUP</span>
              </div>
            </div>
          </div>

          {/* Adversário */}
          <div className="text-center md:text-left">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white text-2xl font-bold mb-3 shadow-lg">
              {opponent.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{opponent.name}</h2>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              {opponent.belt}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Informações e Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Atleta */}
        <div className="card-modern p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold">
              {athlete.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{athlete.name}</h3>
              <p className="text-sm text-gray-500">Atleta Principal</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-600">Idade</span>
                <span className="text-2xl font-bold text-gray-900">{athlete.age}</span>
              </div>
              <span className="text-xs text-gray-500">anos</span>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-600">Peso</span>
                <span className="text-2xl font-bold text-gray-900">{athlete.weight}</span>
              </div>
              <span className="text-xs text-gray-500">kg</span>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-600">Estilo</span>
                <span className="text-lg font-bold text-blue-600">{athlete.style}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Condicionamento</span>
                <span className="text-2xl font-bold text-gray-900">{athlete.cardio}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${athlete.cardio}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico Radar - Central */}
        <div className="card-modern p-6 lg:col-span-1">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4 text-center">Comparação de Atributos</h3>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={comparisonData}>
              <PolarGrid stroke="#e5e7eb" strokeWidth={1.5} />
              <PolarAngleAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fontWeight: 600, fill: '#4b5563' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickCount={6}
              />
              <Radar
                name={athlete.name}
                dataKey={athlete.name}
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Radar
                name={opponent.name}
                dataKey={opponent.name}
                stroke="#f97316"
                fill="#f97316"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '13px', fontWeight: 600 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Card Adversário */}
        <div className="card-modern p-6 border-l-4 border-orange-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center font-bold">
              {opponent.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{opponent.name}</h3>
              <p className="text-sm text-gray-500">Adversário</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-600">Idade</span>
                <span className="text-2xl font-bold text-gray-900">{opponent.age}</span>
              </div>
              <span className="text-xs text-gray-500">anos</span>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-600">Peso</span>
                <span className="text-2xl font-bold text-gray-900">{opponent.weight}</span>
              </div>
              <span className="text-xs text-gray-500">kg</span>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-600">Estilo</span>
                <span className="text-lg font-bold text-orange-600">{opponent.style}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Condicionamento</span>
                <span className="text-2xl font-bold text-gray-900">{opponent.cardio}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-red-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${opponent.cardio}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Análise de Diferenças - Redesenhada */}
      <div className="card-modern p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Análise de Diferenças</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Diferença de Idade */}
          <div className="stat-card group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Diferença de Idade</span>
              <div className={`w-3 h-3 rounded-full ${ageDiff > 5 ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-gray-900">{ageDiff}</span>
              <span className="text-lg font-medium text-gray-500">anos</span>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                ageDiff > 5 
                  ? 'bg-red-100 text-red-800' 
                  : ageDiff > 2
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {ageDiff > 5 ? '⚠️ Diferença significativa' : ageDiff > 2 ? '📊 Diferença moderada' : '✓ Diferença pequena'}
              </span>
            </div>
          </div>

          {/* Diferença de Peso */}
          <div className="stat-card group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Diferença de Peso</span>
              <div className={`w-3 h-3 rounded-full ${weightDiff > 10 ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-gray-900">{weightDiff}</span>
              <span className="text-lg font-medium text-gray-500">kg</span>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                weightDiff > 10 
                  ? 'bg-red-100 text-red-800' 
                  : weightDiff > 5
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {weightDiff > 10 ? '⚠️ Diferença significativa' : weightDiff > 5 ? '📊 Diferença moderada' : '✓ Diferença pequena'}
              </span>
            </div>
          </div>

          {/* Diferença de Condicionamento */}
          <div className="stat-card group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Diferença de Condicionamento</span>
              <div className={`w-3 h-3 rounded-full ${cardioDiff > 20 ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-gray-900">{cardioDiff}</span>
              <span className="text-lg font-medium text-gray-500">%</span>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                cardioDiff > 20 
                  ? 'bg-red-100 text-red-800' 
                  : cardioDiff > 10
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {cardioDiff > 20 ? '⚠️ Diferença significativa' : cardioDiff > 10 ? '📊 Diferença moderada' : '✓ Diferença pequena'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
