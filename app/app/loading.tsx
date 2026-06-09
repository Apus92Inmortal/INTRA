export default function AppDashboardLoading() {
  return (
    <main className="intra-page-shell">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="space-y-3">
          <div className="intra-skeleton h-8 w-48" />
          <div className="intra-skeleton h-4 w-72 max-w-full" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="intra-skeleton h-24" />
          <div className="intra-skeleton h-24" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="intra-skeleton h-24"
            />
          ))}
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="intra-skeleton h-40"
              />
            ))}
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="intra-skeleton h-40" />
            <div className="intra-skeleton h-64" />
            <div className="intra-skeleton h-48 bg-intra-blue" />
          </div>
        </div>
      </div>
    </main>
  );
}
