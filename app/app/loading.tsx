export default function AppDashboardLoading() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="space-y-3">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-4 w-40 animate-pulse rounded-xl bg-slate-100" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-300" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="h-44 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-52 animate-pulse rounded-2xl bg-[#0B2C4A]" />
          </div>
        </div>
      </div>
    </main>
  );
}
