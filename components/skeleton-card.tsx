export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="aspect-square bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-10 bg-slate-200 rounded animate-pulse" />
        <div className="h-6 bg-slate-200 rounded w-3/4 animate-pulse" />
        <div className="flex gap-2 pt-2">
          <div className="h-6 bg-slate-200 rounded-full w-16 animate-pulse" />
          <div className="h-6 bg-slate-200 rounded w-12 animate-pulse" />
        </div>
        <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
