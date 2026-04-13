"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ActionResult = Promise<{ success: boolean; error?: string }>;

type Props = {
  matchId: string;
  status: string;
  canAccept: boolean;
  canCancel: boolean;
  onAccept: (matchId: string) => ActionResult;
  onReject: (matchId: string) => ActionResult;
  onCancel: (matchId: string) => ActionResult;
};

type ActiveAction = "accept" | "reject" | "cancel" | null;

export default function MatchDetailActions({
  matchId,
  status,
  canAccept,
  canCancel,
  onAccept,
  onReject,
  onCancel,
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

  function handleCancel() {
    setError(null);
    setActiveAction("cancel");

    startTransition(async () => {
      const result = await onCancel(matchId);

      if (!result.success) {
        setError(result.error || "No se pudo cancelar el match");
        setActiveAction(null);
        return;
      }

      router.refresh();
    });
  }

  if (status !== "pending" && status !== "accepted") {
    return null;
  }

  const isOwnerPending = status === "pending" && canAccept;
  const redButtonText =
    status === "pending"
      ? canAccept
        ? "Rechazar match"
        : "Cancelar solicitud"
      : "Cancelar match";

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-3">
        {canAccept && status === "pending" && (
          <button
            onClick={handleAccept}
            disabled={isPending}
            className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {isPending && activeAction === "accept"
              ? "Procesando..."
              : "Aceptar match"}
          </button>
        )}

        {canCancel && (status === "pending" || status === "accepted") && (
          <button
            onClick={isOwnerPending ? handleReject : handleCancel}
            disabled={isPending}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {isPending &&
            (activeAction === "reject" || activeAction === "cancel")
              ? "Procesando..."
              : redButtonText}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}