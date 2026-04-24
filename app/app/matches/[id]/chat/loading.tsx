export default function MatchChatLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="space-y-4">
        <div className="h-[500px] rounded-2xl border bg-white p-4">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
              >
                <div className="w-full max-w-[75%] rounded-2xl bg-slate-100 px-4 py-3">
                  <div className="h-4 w-3/4 animate-pulse rounded-xl bg-slate-200" />
                  <div className="mt-2 h-3 w-24 animate-pulse rounded-xl bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded border bg-white" />
          <div className="h-10 w-24 animate-pulse rounded bg-slate-900" />
        </div>
      </div>
    </main>
  );
}
