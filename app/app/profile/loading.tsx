export default function ProfileLoading() {
  return (
    <main className="intra-page-shell">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-3">
          <div className="h-9 w-40 animate-pulse rounded-xl bg-intra-border-strong" />
          <div className="h-4 w-80 animate-pulse rounded-xl bg-intra-neutral-soft-alt" />
        </div>

        <section className="intra-card p-6 sm:p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="h-6 w-44 animate-pulse rounded-xl bg-intra-border-strong" />
              <div className="h-4 w-72 animate-pulse rounded-xl bg-intra-neutral-soft-alt" />
            </div>

            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded-xl bg-intra-border-strong" />
                <div className="h-12 animate-pulse rounded-xl bg-intra-neutral-soft-alt" />
              </div>
            ))}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <div className="h-12 w-36 animate-pulse rounded-2xl bg-intra-blue" />
              <div className="h-12 w-36 animate-pulse rounded-2xl bg-intra-neutral-soft-alt" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
