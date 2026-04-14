// Skeleton que imita a forma do AthleteCard enquanto carrega
function Pulse({ className }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

export default function AthleteCardSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-6 pb-4">
        {/* Avatar + nome + badge */}
        <div className="flex items-start gap-3 mb-4">
          <Pulse className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2 pt-1">
            <Pulse className="h-5 w-2/3" />
            <Pulse className="h-3 w-1/3" />
          </div>
          <Pulse className="h-6 w-14 rounded-full shrink-0" />
        </div>

        {/* Badge de análises */}
        <Pulse className="h-8 w-36 rounded-xl" />
      </div>

      {/* Botão */}
      <div className="px-5 pb-5">
        <Pulse className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}
