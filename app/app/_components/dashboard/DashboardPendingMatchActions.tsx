"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("accept")}
          className="intra-btn intra-btn-primary min-h-11 flex-1 px-4 py-2.5"
        >
          {isPending && activeAction === "accept" ? "Procesando..." : "Aceptar"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("reject")}
          className="intra-btn intra-btn-secondary min-h-11 flex-1 border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
        >
          {isPending && activeAction === "reject" ? "Procesando..." : "Rechazar"}
        </button>
      </div>

      {error ? (
        <p className="intra-caption text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
