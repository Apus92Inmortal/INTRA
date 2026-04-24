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
  const [error, setError] = useState<string | null>(null);

  const handleAction = (type: "accept" | "reject") => {
    startTransition(async () => {
      setError(null);

      const result =
        type === "accept"
          ? await acceptMatchAction(matchId)
          : await rejectMatchAction(matchId);

      if (!result.success) {
        setError(result.error ?? "No se pudo procesar la acción");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("accept")}
          className="flex-1 rounded-xl bg-[#2ECC71] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#27ae60] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Procesando..." : "Aceptar"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => handleAction("reject")}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Procesando..." : "Rechazar"}
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
