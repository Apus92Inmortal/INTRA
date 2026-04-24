export default function ProfileLoading() {
  return (
    <main className="min-h-screen bg-[#EEF2F7]">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div className="space-y-3">
          <div className="h-9 w-40 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-4 w-80 animate-pulse rounded-xl bg-slate-100" />
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="h-6 w-44 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-4 w-72 animate-pulse rounded-xl bg-slate-100" />
            </div>

            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded-xl bg-slate-200" />
                <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ))}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <div className="h-12 w-36 animate-pulse rounded-2xl bg-slate-900" />
              <div className="h-12 w-36 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
