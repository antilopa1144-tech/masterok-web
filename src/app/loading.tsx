export default function Loading() {
  return (
    <div className="page-container py-16">
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        {/* Hero skeleton */}
        <div className="text-center space-y-4">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mx-auto" />
          <div className="h-12 w-96 max-w-full bg-slate-200 dark:bg-slate-700 rounded-xl mx-auto" />
          <div className="h-5 w-72 max-w-full bg-slate-100 dark:bg-slate-800 rounded-lg mx-auto" />
        </div>

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3"
            >
              <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
