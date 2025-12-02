import { Link } from 'react-router-dom';
import StatsRadarChart from '../components/charts/StatsRadarChart';
import StatsBarChart from '../components/charts/StatsBarChart';
import StatsLineChart from '../components/charts/StatsLineChart';

const metricHighlights = [
  { label: 'Total de Atletas', value: '12', link: '/athletes', linkLabel: 'Ver todos' },
  { label: 'Total de Adversários', value: '8', link: '/opponents', linkLabel: 'Ver todos' },
  { label: 'Lutas analisadas', value: '24', link: '/analyze-video', linkLabel: 'Analisar nova' },
];

const quickActions = [
  { icon: '🥋', title: 'Gerenciar Atletas', description: 'Cadastre e acompanhe seus atletas', to: '/athletes' },
  { icon: '📊', title: 'Comparar Lutadores', description: 'Analise diferenças táticas', to: '/compare' },
  { icon: '🎯', title: 'Estratégia com IA', description: 'Crie planos de luta inteligentes', to: '/strategy' },
];

const heroTags = ['Atletas', 'Comparação', 'Estratégia IA'];

export default function Dashboard() {
  const selectedAthlete = { name: 'João Silva', cardio: 85 };

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
    { name: 'Queda', value: 15 },
    { name: 'Passagem', value: 12 },
  ];

  const evolutionData = [
    { date: 'Jan', value: 45 },
    { date: 'Fev', value: 52 },
    { date: 'Mar', value: 48 },
    { date: 'Abr', value: 65 },
    { date: 'Mai', value: 72 },
    { date: 'Jun', value: 78 },
  ];

  return (
    <div className="dashboard-wrapper animate-fadeIn" style={{ width: '100vw' }}>
      <section className="panel panel--hero">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1 className="hero-title">Análise Tática de Jiu-Jitsu</h1>
          <p className="hero-description">
            Gerencie atletas, analise adversários e desenvolva estratégias personalizadas com IA.
          </p>
        </div>
        <div className="hero-meta">
          <p>Resumo rápido com métricas, gráficos e próximos passos principais.</p>
          <div className="tag-list">
            {heroTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="section-header">
          <p className="section-header__eyebrow" style={{ marginLeft: "1vw"}}>Resumo</p>
          <h2 className="section-header__title" style={{ marginLeft: "1vw"}}>Indicadores principais</h2>
        </div>
        <div className="metric-grid">
          {metricHighlights.map((card) => (
            <article key={card.label} className="metric-card">
              <p className="metric-card__label">{card.label}</p>
              <p className="metric-card__value">{card.value}</p>
              <Link to={card.link} className="metric-card__link">
                {card.linkLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="chart-grid">
        <article className="panel chart-card">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Perfil de {selectedAthlete.name}</p>
              <h3 className="panel__title">Distribuição de atributos</h3>
            </div>
            <span className="panel__meta">Condicionamento {selectedAthlete.cardio}%</span>
          </div>
          <div className="chart-area">
            <StatsRadarChart data={athleteRadarData} />
          </div>
        </article>

        <article className="panel chart-card">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Ataques mais utilizados</p>
              <h3 className="panel__title">Distribuição ofensiva recente</h3>
            </div>
            <span className="panel__meta">Últimas 5 lutas</span>
          </div>
          <div className="chart-area">
            <StatsBarChart data={attacksData} />
          </div>
        </article>

        <article className="panel chart-card chart-card--wide">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Evolução</p>
              <h3 className="panel__title">Desempenho dos últimos 6 meses</h3>
            </div>
            <span className="panel__meta">+33% no período</span>
          </div>
          <div className="chart-area chart-area--large">
            <StatsLineChart data={evolutionData} />
          </div>
        </article>
      </section>

      <section className="panel">
        <div className="section-header">
          <p className="section-header__eyebrow">Próximos passos</p>
          <h2 className="section-header__title">Escolha o fluxo que deseja seguir</h2>
        </div>
        <div className="cta-grid">
          {quickActions.map((action) => (
            <Link key={action.title} to={action.to} className="cta-card">
              <div className="cta-card__icon" aria-hidden="true">
                {action.icon}
              </div>
              <p className="cta-card__title">{action.title}</p>
              <p className="cta-card__description">{action.description}</p>
              <span className="cta-card__link">Acessar →</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
