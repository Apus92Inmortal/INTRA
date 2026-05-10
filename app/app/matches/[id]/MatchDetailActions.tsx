"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleX, XCircle } from "lucide-react";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {canAccept && status === "pending" && (
          <button
            onClick={handleAccept}
            disabled={isPending}
            className="intra-btn w-full gap-2 rounded-2xl bg-intra-blue px-5 py-2.5 text-white hover:opacity-95 disabled:opacity-50 sm:w-auto"
          >
            <CheckCircle2 className="intra-icon-body" strokeWidth={2.1} />
            {isPending && activeAction === "accept"
              ? "Procesando..."
              : "Aceptar match"}
          </button>
        )}

        {canCancel && (status === "pending" || status === "accepted") && (
          <button
            onClick={isOwnerPending ? handleReject : handleCancel}
            disabled={isPending}
            className={`intra-btn w-full gap-2 rounded-2xl px-5 py-2.5 transition disabled:opacity-50 ${
              canAccept && status === "pending" ? "sm:w-auto" : ""
            } ${
              status === "accepted"
                ? "border border-intra-danger-border bg-intra-card text-intra-danger hover:bg-intra-danger-soft"
                : canAccept && status === "pending"
                ? "border border-intra-border-strong bg-intra-card text-intra-text-muted hover:bg-intra-neutral-soft-alt"
                  : "border border-intra-danger-border bg-intra-card text-intra-danger hover:bg-intra-danger-soft"
            }`}
          >
            {status === "accepted" || !(canAccept && status === "pending") ? (
              <XCircle className="intra-icon-body" strokeWidth={2.1} />
            ) : (
              <CircleX className="intra-icon-body" strokeWidth={2.1} />
            )}
            {isPending &&
            (activeAction === "reject" || activeAction === "cancel")
              ? "Procesando..."
              : redButtonText}
          </button>
        )}
      </div>

      {error && <p className="mt-3 intra-caption text-intra-danger">{error}</p>}
    </div>
  );
}
