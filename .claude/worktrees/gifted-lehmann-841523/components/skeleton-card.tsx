export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm animate-pulse">
      <div className="w-full h-60 bg-slate-200 rounded-t-lg" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-5 bg-slate-200 rounded w-1/4" />
          <div className="h-6 bg-slate-200 rounded-full w-16" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
