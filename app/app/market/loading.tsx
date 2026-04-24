export default function MarketLoading() {
  return (
    <main className="min-h-screen bg-[#EEF2F7]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-3">
          <div className="h-9 w-40 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-4 w-80 animate-pulse rounded-xl bg-slate-100" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>

        {Array.from({ length: 4 }).map((_, sectionIndex) => (
          <section key={sectionIndex} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 space-y-2">
              <div className="h-6 w-44 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-4 w-72 animate-pulse rounded-xl bg-slate-100" />
            </div>

            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, itemIndex) => (
                <div key={itemIndex} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-36 animate-pulse rounded-xl bg-slate-200" />
                      <div className="h-4 w-52 animate-pulse rounded-xl bg-slate-100" />
                      <div className="h-4 w-64 animate-pulse rounded-xl bg-slate-100" />
                    </div>
                    <div className="h-4 w-20 animate-pulse rounded-xl bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
