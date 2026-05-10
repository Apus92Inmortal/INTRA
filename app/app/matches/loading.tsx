export default function MatchesLoading() {
  return (
    <main className="intra-page-shell">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-3">
          <div className="h-9 w-44 animate-pulse rounded-xl bg-intra-border-strong" />
          <div className="h-4 w-80 animate-pulse rounded-xl bg-intra-neutral-pill" />
        </div>

        {Array.from({ length: 3 }).map((_, index) => (
          <section
            key={index}
            className="overflow-hidden rounded-3xl border border-intra-border-strong bg-intra-card shadow-sm"
          >
            <div className="border-b border-intra-border-soft px-6 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  <div className="h-7 w-24 animate-pulse rounded-full bg-intra-border-strong" />
                  <div className="h-7 w-32 animate-pulse rounded-full bg-intra-neutral-pill" />
                  <div className="h-7 w-24 animate-pulse rounded-full bg-intra-neutral-pill" />
                </div>
                <div className="h-7 w-28 animate-pulse rounded-full bg-intra-neutral-pill" />
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 xl:grid-cols-[1fr_1fr_220px]">
                {Array.from({ length: 3 }).map((_, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="rounded-2xl border border-intra-border-strong bg-[linear-gradient(180deg,var(--intra-card)_0%,var(--intra-info-soft-alt)_100%)] p-5"
                  >
                    <div className="space-y-3">
                      <div className="h-5 w-24 animate-pulse rounded-xl bg-intra-border-strong" />
                      <div className="h-4 w-44 animate-pulse rounded-xl bg-intra-neutral-pill" />
                      <div className="h-4 w-36 animate-pulse rounded-xl bg-intra-neutral-pill" />
                      <div className="h-4 w-28 animate-pulse rounded-xl bg-intra-neutral-pill" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-intra-border-strong bg-[linear-gradient(180deg,var(--intra-card)_0%,var(--intra-neutral-soft-alt)_100%)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="h-4 w-28 animate-pulse rounded-xl bg-intra-border-strong" />
                  <div className="h-4 w-20 animate-pulse rounded-xl bg-intra-neutral-pill" />
                </div>
                <div className="h-16 animate-pulse rounded-2xl bg-intra-card" />
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
