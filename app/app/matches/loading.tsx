export default function MatchesLoading() {
  return (
    <main className="min-h-screen bg-[#EEF2F7]">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-3">
          <div className="h-9 w-44 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-4 w-80 animate-pulse rounded-xl bg-slate-100" />
        </div>

        {Array.from({ length: 3 }).map((_, index) => (
          <section
            key={index}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 px-6 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 w-24 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-7 w-32 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100" />
                </div>
                <div className="h-7 w-28 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr_220px]">
                {Array.from({ length: 3 }).map((_, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="space-y-3">
                      <div className="h-5 w-24 animate-pulse rounded-xl bg-slate-200" />
                      <div className="h-4 w-44 animate-pulse rounded-xl bg-slate-100" />
                      <div className="h-4 w-36 animate-pulse rounded-xl bg-slate-100" />
                      <div className="h-4 w-28 animate-pulse rounded-xl bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="h-4 w-28 animate-pulse rounded-xl bg-slate-200" />
                  <div className="h-4 w-20 animate-pulse rounded-xl bg-slate-100" />
                </div>
                <div className="h-16 animate-pulse rounded-2xl bg-white" />
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
