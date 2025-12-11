import { Link } from 'react-router-dom';

// Componentes de ícones SVG reutilizáveis
const CheckIcon = () => (
  <svg className="h-5 w-5 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const VideoIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

// Classes reutilizáveis
const BUTTON_PRIMARY = "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 px-6 text-sm font-medium text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg focus:ring-2 focus:ring-slate-900 focus:ring-offset-2";
const BUTTON_SECONDARY = "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white py-3 px-6 text-sm font-medium text-slate-900 shadow-sm transition-all hover:border-slate-400 hover:shadow-md focus:ring-2 focus:ring-slate-300 focus:ring-offset-2";

const features = [
  {
    icon: '🥋',
    title: 'Gerenciamento de Atletas',
    description: 'Cadastre seus atletas, adicione vídeos de lutas e gere análises técnicas detalhadas com IA.',
    highlights: ['Perfis completos', 'Análise de vídeo com IA', 'Histórico de evolução'],
    to: '/athletes',
    cta: 'Acessar Atletas'
  },
  {
    icon: '🎯',
    title: 'Análise de Adversários',
    description: 'Monitore adversários, identifique padrões técnicos e descubra pontos fracos para explorar.',
    highlights: ['Perfil técnico detalhado', 'Estatísticas de luta', 'Pontos vulneráveis'],
    to: '/opponents',
    cta: 'Ver Adversários'
  },
  {
    icon: '📊',
    title: 'Comparação Tática',
    description: 'Compare atletas e adversários lado a lado para identificar vantagens e desvantagens técnicas.',
    highlights: ['Comparação visual', 'Análise de atributos', 'Matchup insights'],
    to: '/compare',
    cta: 'Comparar Lutadores'
  },
  {
    icon: '🤖',
    title: 'Estratégia com IA',
    description: 'Gere planos de luta personalizados usando inteligência artificial baseada nos perfis técnicos.',
    highlights: ['Estratégias personalizadas', 'Plano por fases', 'Checklist tático'],
    to: '/strategy',
    cta: 'Criar Estratégia'
  }
];

const capabilities = [
  {
    title: 'Inteligência Artificial',
    description: 'Análise de vídeos e geração de estratégias usando Gemini 2.0 Flash',
    icon: '🧠'
  },
  {
    title: 'Análise Técnica',
    description: 'Perfis detalhados com 5 atributos principais e estatísticas de luta',
    icon: '📈'
  },
  {
    title: 'Visualização de Dados',
    description: 'Gráficos interativos para análise comparativa e evolução temporal',
    icon: '📊'
  }
];

export default function Overview() {
  return (
    <div className="dashboard-wrapper animate-fadeIn">
      {/* Hero Section */}
      <section className="panel panel--hero">
        <div>
          <p className="eyebrow">Bem-vindo</p>
          <h1 className="hero-title">JiuMetrics</h1>
          <p className="hero-description">
            Plataforma completa de análise tática para Jiu-Jitsu. 
            Gerencie atletas, estude adversários e desenvolva estratégias vencedoras com inteligência artificial.
          </p>
        </div>
        <div className="hero-meta">
          <p>Sistema profissional de scouting e preparação técnica para academias e competidores.</p>
        </div>
      </section>

      {/* Capacidades da Plataforma */}
      <section>
        <div className="section-header">
          <p className="section-header__eyebrow">Tecnologia</p>
          <h2 className="section-header__title">O que a plataforma oferece</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {capabilities.map((capability) => (
            <article key={capability.title} className="panel">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                  {capability.icon}
                </div>
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900">{capability.title}</h3>
                  <p className="text-sm text-slate-600">{capability.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Módulos Principais */}
      <section>
        <div className="section-header">
          <p className="section-header__eyebrow">Módulos</p>
          <h2 className="section-header__title">Funcionalidades principais</h2>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {features.map((feature) => (
            <article key={feature.title} className="panel">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                  </div>
                </div>
              </div>
              
              <p className="mb-4 text-slate-600">{feature.description}</p>
              
              <ul className="mb-6 space-y-2">
                {feature.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckIcon />
                    {highlight}
                  </li>
                ))}
              </ul>
              
              <Link
                to={feature.to}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-medium text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg"
              >
                {feature.cta}
                <ChevronRightIcon />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="panel bg-linear-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900">Pronto para começar?</h2>
          <p className="mb-6 text-slate-600">
            Escolha um dos módulos acima para iniciar sua análise tática ou comece cadastrando seu primeiro atleta.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/athletes" className={BUTTON_PRIMARY}>
              <PlusIcon />
              Novo Atleta
            </Link>
            <Link to="/analyze-video" className={BUTTON_SECONDARY}>
              <VideoIcon />
              Analisar Vídeo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
