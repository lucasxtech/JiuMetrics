function Pulse({ className }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

// Skeleton do Overview (4 stat cards + ações rápidas + análises recentes)
function OverviewSkeleton() {
  return (
    <div className="dashboard-wrapper">
      <div className="panel panel--hero">
        <div className="space-y-3">
          <Pulse className="h-3 w-16" />
          <Pulse className="h-9 w-64" />
          <Pulse className="h-4 w-48" />
        </div>
      </div>
      {/* 4 stat cards */}
      <section>
        <div className="section-header">
          <Pulse className="h-3 w-12" />
          <Pulse className="h-6 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="panel flex items-center gap-4">
              <Pulse className="h-12 w-12 rounded-xl shrink-0" />
              <div className="space-y-2 flex-1">
                <Pulse className="h-3 w-16" />
                <Pulse className="h-7 w-12" />
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* Ações rápidas + recentes */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel space-y-3">
          <Pulse className="h-5 w-28 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Pulse key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
        <div className="panel space-y-3">
          <Pulse className="h-5 w-36 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Pulse key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </section>
    </div>
  );
}

// Skeleton da Estratégia (2 painéis de seleção + botão)
function StrategySkeleton() {
  return (
    <div className="dashboard-wrapper">
      <div className="panel panel--hero">
        <div className="space-y-3">
          <Pulse className="h-3 w-20" />
          <Pulse className="h-9 w-72" />
          <Pulse className="h-4 w-56" />
        </div>
      </div>
      <section>
        <div className="section-header">
          <Pulse className="h-3 w-12" />
          <Pulse className="h-6 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="panel space-y-4">
              <div>
                <Pulse className="h-3 w-12 mb-1" />
                <Pulse className="h-5 w-32" />
              </div>
              <Pulse className="h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </section>
      <div className="panel">
        <div className="flex flex-col items-center gap-4">
          <Pulse className="h-6 w-40" />
          <Pulse className="h-4 w-64" />
          <Pulse className="h-12 w-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// Skeleton da página IA / VideoAnalysis (form com selects + input + botão)
function VideoAnalysisSkeleton() {
  return (
    <div className="dashboard-wrapper">
      <div className="panel panel--hero">
        <div className="space-y-3">
          <Pulse className="h-3 w-16" />
          <Pulse className="h-9 w-64" />
          <Pulse className="h-4 w-48" />
        </div>
      </div>
      <div className="panel space-y-6">
        {/* 2 selects no topo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Pulse className="h-3 w-10" />
            <Pulse className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Pulse className="h-3 w-16" />
            <Pulse className="h-11 w-full rounded-xl" />
          </div>
        </div>
        {/* Select de resultado */}
        <div className="space-y-1.5">
          <Pulse className="h-3 w-32" />
          <Pulse className="h-11 w-full rounded-xl" />
        </div>
        {/* Card de vídeo */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 space-y-3">
          <Pulse className="h-3 w-16" />
          <Pulse className="h-9 w-full rounded-md" />
          <div className="flex gap-2 mt-2">
            <Pulse className="h-7 w-16 rounded-md" />
            <Pulse className="h-7 w-16 rounded-md" />
            <Pulse className="h-7 w-16 rounded-md" />
          </div>
        </div>
        {/* Botão */}
        <Pulse className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton exibido durante carregamento lazy — detecta rota atual
 */
export default function PageLoader() {
  const path = window.location.pathname;
  if (path === '/') return <OverviewSkeleton />;
  if (path === '/strategy') return <StrategySkeleton />;
  if (path === '/analyze-video') return <VideoAnalysisSkeleton />;

  // Fallback genérico (Atletas/Adversários/Análises já têm skeleton inline)
  return (
    <div className="dashboard-wrapper">
      <div className="panel panel--hero">
        <div className="space-y-3">
          <Pulse className="h-3 w-16" />
          <Pulse className="h-9 w-64" />
          <Pulse className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Pulse className="w-12 h-12 rounded-2xl shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Pulse className="h-5 w-2/3" />
                  <Pulse className="h-3 w-1/3" />
                </div>
              </div>
              <Pulse className="h-8 w-36 rounded-xl" />
            </div>
            <div className="px-5 pb-5"><Pulse className="h-12 w-full rounded-2xl" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
