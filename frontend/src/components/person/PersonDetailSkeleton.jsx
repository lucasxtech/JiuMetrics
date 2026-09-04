export default function PersonDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-8 w-56 rounded-lg bg-slate-200" />
          <div className="h-7 w-32 rounded-md bg-slate-200" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-20 rounded-xl bg-slate-200" />
          <div className="h-9 w-20 rounded-xl bg-red-100" />
        </div>
      </div>

      <div className="panel space-y-4">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-slate-200" />
          <div className="h-5 w-40 rounded bg-slate-200" />
        </div>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="h-4 w-full rounded bg-slate-200" />
          <div className="h-4 w-5/6 rounded bg-slate-200" />
          <div className="h-4 w-3/4 rounded bg-slate-200" />
        </div>
      </div>

      <div className="panel space-y-3">
        <div className="mb-2 h-5 w-36 rounded bg-slate-200" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl border border-slate-200 bg-slate-50" />
        ))}
      </div>
    </div>
  );
}
