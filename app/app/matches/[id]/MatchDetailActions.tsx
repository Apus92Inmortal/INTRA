"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleX } from "lucide-react";

type ActionResult = Promise<{ success: boolean; error?: string }>;

type Props = {
  matchId: string;
  status: string;
  canAccept: boolean;
  onAccept: (matchId: string) => ActionResult;
  onReject: (matchId: string) => ActionResult;
};

type ActiveAction = "accept" | "reject" | null;

export default function MatchDetailActions({
  matchId,
  status,
  canAccept,
  onAccept,
  onReject,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);
    setActiveAction("accept");

    startTransition(async () => {
      const result = await onAccept(matchId);

      if (!result.success) {
        setError(result.error || "No se pudo aceptar el match");
        setActiveAction(null);
        return;
      }

      router.refresh();
    });
  }

  function handleReject() {
    setError(null);
    setActiveAction("reject");

    startTransition(async () => {
      const result = await onReject(matchId);

      if (!result.success) {
        setError(result.error || "No se pudo rechazar el match");
        setActiveAction(null);
        return;
      }

      router.refresh();
    });
  }

  if (status !== "pending" || !canAccept) {
    return null;
  }

  return (
    <div className="mt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={handleAccept}
          disabled={isPending}
          className="intra-btn w-full gap-2 rounded-2xl bg-intra-blue px-5 py-2.5 text-white hover:opacity-95 disabled:opacity-50 sm:w-auto"
        >
          <CheckCircle2 className="intra-icon-body" strokeWidth={2.1} />
          {isPending && activeAction === "accept"
            ? "Procesando..."
            : "Aceptar match"}
        </button>

        <button
          type="button"
          onClick={handleReject}
          disabled={isPending}
          className="intra-btn w-full gap-2 rounded-2xl border border-intra-border-strong bg-intra-card px-5 py-2.5 text-intra-text-muted transition hover:bg-intra-neutral-soft-alt disabled:opacity-50 sm:w-auto"
        >
          <CircleX className="intra-icon-body" strokeWidth={2.1} />
          {isPending && activeAction === "reject" ? "Procesando..." : "Rechazar match"}
        </button>
      </div>

      {error && <p className="mt-3 intra-caption text-intra-danger">{error}</p>}
    </div>
  );
}
