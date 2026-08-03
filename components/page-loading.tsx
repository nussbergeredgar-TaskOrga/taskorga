export function PageLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded bg-ink-100" />
          <div className="h-4 w-56 rounded bg-ink-100" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-ink-100" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-card border border-ink-100 bg-surface p-5">
            <div className="h-4 w-2/3 rounded bg-ink-100 mb-3" />
            <div className="h-3 w-1/2 rounded bg-ink-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
