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
          className="intra-btn min-h-[48px] flex-1 gap-2 rounded-xl bg-intra-trust-success-fg px-4 py-3 text-base font-bold text-intra-card hover:bg-intra-green-hover-app"
        >
          <CheckCircle2 className="h-4 w-4" />
          {isPending && activeAction === "accept" ? "Procesando..." : "Aceptar"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("reject")}
          className="intra-btn min-h-[48px] flex-1 gap-2 rounded-xl border border-intra-trust-neutral-border px-4 py-3 text-base font-bold text-intra-trust-ink hover:bg-intra-bg-app"
        >
          <XCircle className="h-4 w-4" />
          {isPending && activeAction === "reject" ? "Procesando..." : "Rechazar"}
        </button>
      </div>

      {error ? (
        <p className="intra-caption text-intra-danger">{error}</p>
      ) : null}
    </div>
  );
}
