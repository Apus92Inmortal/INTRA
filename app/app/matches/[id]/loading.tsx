export default function MatchDetailLoading() {
  return (
    <main className="intra-page-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-3xl border border-intra-border bg-intra-card shadow-sm">
          <div className="border-b border-intra-border px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <div className="h-9 w-52 animate-pulse rounded-xl bg-intra-border-strong" />
                <div className="h-4 w-80 animate-pulse rounded-xl bg-intra-neutral-pill" />
              </div>
              <div className="h-8 w-28 animate-pulse rounded-full bg-intra-neutral-pill" />
            </div>
          </div>

          <div className="space-y-6 px-6 py-6 sm:px-8">
            <div className="grid gap-5 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <section key={index} className="rounded-2xl border border-intra-border bg-intra-card p-5 shadow-sm">
                  <div className="space-y-3">
                    <div className="h-6 w-24 animate-pulse rounded-xl bg-intra-border-strong" />
                    <div className="h-4 w-36 animate-pulse rounded-xl bg-intra-neutral-pill" />
                    <div className="h-4 w-48 animate-pulse rounded-xl bg-intra-neutral-pill" />
                    <div className="h-4 w-32 animate-pulse rounded-xl bg-intra-neutral-pill" />
                    <div className="h-4 w-56 animate-pulse rounded-xl bg-intra-neutral-pill" />
                  </div>
                </section>
              ))}
            </div>

            <section className="rounded-2xl border border-intra-border bg-intra-neutral-soft-alt p-5">
              <div className="space-y-3">
                <div className="h-6 w-36 animate-pulse rounded-xl bg-intra-border-strong" />
                <div className="h-11 w-40 animate-pulse rounded-2xl bg-intra-border-strong" />
                <div className="h-11 w-36 animate-pulse rounded-2xl bg-intra-neutral-pill" />
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <div className="h-11 w-32 animate-pulse rounded-2xl bg-intra-border-strong" />
              <div className="h-11 w-36 animate-pulse rounded-2xl bg-intra-neutral-pill" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
