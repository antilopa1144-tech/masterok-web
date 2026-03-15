export default function CalculatorsLoading() {
  return (
    <div className="page-container py-10">
      <div className="animate-pulse space-y-8">
        {/* Breadcrumb skeleton */}
        <div className="flex gap-2">
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-4 w-4 bg-slate-100 dark:bg-slate-800 rounded" />
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>

        {/* Title skeleton */}
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded-lg" />

        {/* Calculator cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-3"
            >
              <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
