import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllAthletes } from '../services/athleteService';
import { getAllOpponents } from '../services/opponentService';
import { getAllAnalyses } from '../services/fightAnalysisService';
import { getUsageStats } from '../services/usageService';

function formatCost(value) {
  if (!value || value === 0) return '$0.00';
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  if (value >= 0.0001) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function StatCard({ icon, label, value, to, loading }) {
  const content = (
    <div className="panel flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        {loading ? (
          <div className="mt-1 h-7 w-12 animate-pulse rounded bg-slate-200" />
        ) : (
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        )}
      </div>
    </div>
  );
  return to ? <Link to={to} className="block transition-transform hover:-translate-y-0.5">{content}</Link> : content;
}

// Ícones SVG para os cards de estatísticas
const IconAthlete = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const IconTarget = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const IconVideo = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const IconCost = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function Overview() {
  const [stats, setStats] = useState({ athletes: 0, opponents: 0, analyses: 0, cost: 0 });
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [athletesRes, opponentsRes, analysesRes, usageRes] = await Promise.allSettled([
          getAllAthletes(),
          getAllOpponents(),
          getAllAnalyses(),
          getUsageStats('month'),
        ]);

        const athletes = athletesRes.status === 'fulfilled' ? (athletesRes.value?.data || []) : [];
        const opponents = opponentsRes.status === 'fulfilled' ? (opponentsRes.value?.data || []) : [];
        const analyses = analysesRes.status === 'fulfilled' ? (analysesRes.value?.data || []) : [];
        const cost = usageRes.status === 'fulfilled' ? (usageRes.value?.stats?.totalCost || 0) : 0;

        // Mapa id → nome para lookup rápido
        const nameMap = {};
        athletes.forEach(a => { nameMap[a.id] = { name: a.name, type: 'athlete' }; });
        opponents.forEach(o => { nameMap[o.id] = { name: o.name, type: 'opponent' }; });

        setStats({
          athletes: athletes.length,
          opponents: opponents.length,
          analyses: analyses.length,
          cost,
        });

        // 5 análises mais recentes, enriquecidas com nome da pessoa
        const sorted = [...analyses].sort((a, b) =>
          new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0)
        );
        const enriched = sorted.slice(0, 5).map(a => ({
          ...a,
          personName: nameMap[a.personId]?.name || null,
        }));
        setRecentAnalyses(enriched);
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  return (
    <div className="dashboard-wrapper animate-fadeIn">

      {/* Header */}
      <section className="panel panel--hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="hero-title">JiuMetrics</h1>
          <p className="hero-description">
            Visão geral do seu sistema de análise tática.
          </p>
        </div>
      </section>

      {/* Métricas */}
      <section>
        <div className="section-header">
          <p className="section-header__eyebrow">Resumo</p>
          <h2 className="section-header__title">Estado atual</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={<IconAthlete />} label="Atletas" value={stats.athletes} to="/athletes" loading={loading} />
          <StatCard icon={<IconTarget />} label="Adversários" value={stats.opponents} to="/opponents" loading={loading} />
          <StatCard icon={<IconVideo />} label="Análises" value={stats.analyses} to="/analyses" loading={loading} />
          <StatCard icon={<IconCost />} label="Custo do mês" value={formatCost(stats.cost)} to="/settings" loading={loading} />
        </div>
      </section>

      {/* Ações rápidas + Recentes */}
      <section className="grid gap-6 lg:grid-cols-2">

        {/* Ações rápidas */}
        <article className="panel">
          <h3 className="mb-4 font-semibold text-slate-900">Ações rápidas</h3>
          <div className="flex flex-col gap-3">
            <Link
              to="/athletes"
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </span>
              <span>Cadastrar novo atleta</span>
            </Link>
            <Link
              to="/opponents"
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </span>
              <span>Cadastrar adversário</span>
            </Link>
            <Link
              to="/analyze-video"
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </span>
              <span>Analisar vídeo de luta</span>
            </Link>
            <Link
              to="/strategy"
              className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 transition-all hover:border-indigo-400 hover:bg-indigo-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </span>
              <span>Gerar estratégia com IA</span>
            </Link>
          </div>
        </article>

        {/* Análises recentes */}
        <article className="panel">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Análises recentes</h3>
            <Link to="/analyses" className="text-xs text-slate-500 hover:text-slate-700">
              Ver todas →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : recentAnalyses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-sm">Nenhuma análise ainda.</p>
              <Link to="/analyze-video" className="mt-2 text-xs text-indigo-600 hover:underline">
                Analisar primeiro vídeo
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentAnalyses.map((analysis) => (
                <li key={analysis.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${analysis.personType === 'athlete' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                      {analysis.personType === 'athlete'
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      }
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-800 leading-tight">
                        {analysis.personName || (analysis.personType === 'athlete' ? 'Atleta' : 'Adversário')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {analysis.personType === 'athlete' ? 'Atleta' : 'Adversário'}{analysis.framesAnalyzed ? ` · ${analysis.framesAnalyzed} frames` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(analysis.createdAt || analysis.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>

      </section>
    </div>
  );
}

