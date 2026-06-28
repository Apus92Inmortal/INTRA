export default function OnboardingLoading() {
  return (
    <main className="intra-page-shell px-4 py-5 sm:px-6 lg:py-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="intra-skeleton h-44" />
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="intra-skeleton h-36" />
          <div className="intra-skeleton h-36" />
          <div className="intra-skeleton h-36" />
        </div>
      </div>
    </main>
  );
}
