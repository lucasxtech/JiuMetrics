// Componente de comparação entre atleta e adversário - Design Moderno
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// Thresholds para classificação de diferenças
const THRESHOLDS = {
  age: { high: 5, medium: 2 },
  weight: { high: 10, medium: 5 },
  cardio: { high: 20, medium: 10 }
};

export default function CompareView({ athlete, opponent }) {
  if (!athlete || !opponent) {
    return (
      <section className="panel text-center" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 mb-6">
          <svg className="h-10 w-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="panel__title mb-2">Nenhuma comparação selecionada</h3>
        <p className="text-slate-600 max-w-md mx-auto">Escolha um atleta e um adversário para liberar a visão comparativa e os gráficos de atributos.</p>
      </section>
    );
  }

  // Pega dados técnicos do perfil ou usa valores padrão
  const getProfileValue = (profile, key, defaultValue = 50) => {
    if (!profile || typeof profile !== 'object') return defaultValue;
    return profile[key] || defaultValue;
  };

  const athleteProfile = athlete.technicalProfile || {};
  const opponentProfile = opponent.technicalProfile || {};

  // Preparar dados para o gráfico radar duplo usando dados reais do technicalProfile
  const comparisonData = [
    {
      name: 'Condicionamento',
      [athlete.name]: athlete.cardio || getProfileValue(athleteProfile, 'cardio', 50),
      [opponent.name]: opponent.cardio || getProfileValue(opponentProfile, 'cardio', 50),
    },
    {
      name: 'Técnica',
      [athlete.name]: getProfileValue(athleteProfile, 'tecnica', 50),
      [opponent.name]: getProfileValue(opponentProfile, 'tecnica', 50),
    },
    {
      name: 'Agressividade',
      [athlete.name]: getProfileValue(athleteProfile, 'agressividade', 50),
      [opponent.name]: getProfileValue(opponentProfile, 'agressividade', 50),
    },
    {
      name: 'Defesa',
      [athlete.name]: getProfileValue(athleteProfile, 'defesa', 50),
      [opponent.name]: getProfileValue(opponentProfile, 'defesa', 50),
    },
    {
      name: 'Movimentação',
      [athlete.name]: getProfileValue(athleteProfile, 'movimentacao', 50),
      [opponent.name]: getProfileValue(opponentProfile, 'movimentacao', 50),
    },
  ];

  const ageDiff = Math.abs(athlete.age - opponent.age);
  const weightDiff = Math.abs(athlete.weight - opponent.weight);
  const cardioDiff = Math.abs(athlete.cardio - opponent.cardio);

  // Classifica diferença (alta, média, baixa)
  const classifyDifference = (diff, thresholds) => {
    if (diff > thresholds.high) return 'high';
    if (diff > thresholds.medium) return 'medium';
    return 'low';
  };

  // Configuração visual por nível de diferença
  const getDiffConfig = (level) => {
    const configs = {
      high: {
        color: 'bg-red-500',
        badgeClass: 'bg-red-100 text-red-800',
        label: '⚠️ Diferença significativa'
      },
      medium: {
        color: 'bg-yellow-500',
        badgeClass: 'bg-yellow-100 text-yellow-800',
        label: '📊 Diferença moderada'
      },
      low: {
        color: 'bg-green-500',
        badgeClass: 'bg-green-100 text-green-800',
        label: '✓ Diferença pequena'
      }
    };
    return configs[level];
  };

  return (
    <div className="space-y-6">
      {/* Header com VS */}
      <article className="panel">
        <div className="grid items-center gap-6 md:grid-cols-3">
          {/* Atleta */}
          <div className="text-center md:text-right">
            <div className="mb-3 inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-2xl font-semibold text-white">
              {athlete.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">{athlete.name}</h2>
            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1 text-sm font-medium text-slate-700">
              <span className="h-2 w-2 rounded-full bg-slate-500"></span>
              {athlete.belt}
            </span>
          </div>

          {/* VS Badge */}
          <div className="flex justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-900 text-3xl font-semibold text-white">
                VS
              </div>
              <span className="mt-3 inline-flex rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-600">Matchup</span>
            </div>
          </div>

          {/* Adversário */}
          <div className="text-center md:text-left">
            <div className="mb-3 inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-2xl font-semibold text-white">
              {opponent.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-semibold text-slate-900 md:text-2xl">{opponent.name}</h2>
            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1 text-sm font-medium text-slate-700">
              <span className="h-2 w-2 rounded-full bg-slate-500"></span>
              {opponent.belt}
            </span>
          </div>
        </div>
      </article>

      {/* Grid de Informações e Radar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Card Atleta */}
        <article className="panel border-l-4 border-slate-900">
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
        </article>

        {/* Gráfico Radar - Central */}
        <article className="panel lg:col-span-1">
          <div className="panel__head justify-center">
            <div>
              <p className="eyebrow text-center">Atributos</p>
              <h3 className="panel__title text-center">Comparação geral</h3>
            </div>
          </div>
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
        </article>

        {/* Card Adversário */}
        <article className="panel border-l-4 border-slate-900">
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
        </article>
      </div>

      {/* Análise de Diferenças - Redesenhada */}
      <article className="panel">
        <div className="panel__head">
          <div>
            <p className="eyebrow">Insights rápidos</p>
            <h3 className="panel__title">Análise de diferenças</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Diferença de Idade */}
          <div className="stat-card group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Diferença de Idade</span>
              <div className={`w-3 h-3 rounded-full ${getDiffConfig(classifyDifference(ageDiff, THRESHOLDS.age)).color} animate-pulse`}></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-gray-900">{ageDiff}</span>
              <span className="text-lg font-medium text-gray-500">anos</span>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                getDiffConfig(classifyDifference(ageDiff, THRESHOLDS.age)).badgeClass
              }`}>
                {getDiffConfig(classifyDifference(ageDiff, THRESHOLDS.age)).label}
              </span>
            </div>
          </div>

          {/* Diferença de Peso */}
          <div className="stat-card group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Diferença de Peso</span>
              <div className={`w-3 h-3 rounded-full ${getDiffConfig(classifyDifference(weightDiff, THRESHOLDS.weight)).color} animate-pulse`}></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-gray-900">{weightDiff}</span>
              <span className="text-lg font-medium text-gray-500">kg</span>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                getDiffConfig(classifyDifference(weightDiff, THRESHOLDS.weight)).badgeClass
              }`}>
                {getDiffConfig(classifyDifference(weightDiff, THRESHOLDS.weight)).label}
              </span>
            </div>
          </div>

          {/* Diferença de Condicionamento */}
          <div className="stat-card group hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Diferença de Condicionamento</span>
              <div className={`w-3 h-3 rounded-full ${getDiffConfig(classifyDifference(cardioDiff, THRESHOLDS.cardio)).color} animate-pulse`}></div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-gray-900">{cardioDiff}</span>
              <span className="text-lg font-medium text-gray-500">%</span>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                getDiffConfig(classifyDifference(cardioDiff, THRESHOLDS.cardio)).badgeClass
              }`}>
                {getDiffConfig(classifyDifference(cardioDiff, THRESHOLDS.cardio)).label}
              </span>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
