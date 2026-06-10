"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  acceptMatchAction,
  rejectMatchAction,
} from "@/app/app/matches/[id]/actions";

export default function DashboardPendingMatchActions({
  matchId,
}: {
  matchId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = (type: "accept" | "reject") => {
    setError(null);
    setActiveAction(type);

    startTransition(async () => {
      const result =
        type === "accept"
          ? await acceptMatchAction(matchId)
          : await rejectMatchAction(matchId);

      if (!result.success) {
        setActiveAction(null);
        setError(result.error ?? "No se pudo procesar la acción");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("accept")}
          className="intra-btn min-h-11 flex-1 gap-2 rounded-[var(--intra-radius-xs)] bg-intra-success-bright px-4 py-2.5 text-intra-card hover:bg-intra-success-bright-hover"
        >
          <CheckCircle2 className="h-4 w-4" />
          {isPending && activeAction === "accept" ? "Procesando..." : "Aceptar"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("reject")}
          className="intra-btn min-h-11 flex-1 gap-2 rounded-[var(--intra-radius-xs)] border border-intra-danger-border bg-intra-danger-soft px-4 py-2.5 text-intra-danger hover:border-intra-danger hover:bg-intra-danger-soft"
        >
          <XCircle className="h-4 w-4 text-intra-danger" />
          {isPending && activeAction === "reject" ? "Procesando..." : "Rechazar"}
        </button>
      </div>

      {error ? (
        <p className="intra-field-error">{error}</p>
      ) : null}
    </div>
  );
}
