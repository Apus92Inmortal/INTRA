"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  matchId: string;
  status: string;
  canAccept: boolean;
  canCancel: boolean;
  onAccept: (matchId: string) => Promise<{ success: boolean; error?: string }>;
  onCancel: (matchId: string) => Promise<{ success: boolean; error?: string }>;
};

export default function MatchDetailActions({
  matchId,
  status,
  canAccept,
  canCancel,
  onAccept,
  onCancel,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAccept() {
    setError(null);

    startTransition(async () => {
      const result = await onAccept(matchId);

      if (!result.success) {
        setError(result.error || "No se pudo aceptar el match");
        return;
      }

      router.refresh();
    });
  }

  function handleCancel() {
    setError(null);

    startTransition(async () => {
      const result = await onCancel(matchId);

      if (!result.success) {
        setError(result.error || "No se pudo cancelar el match");
        return;
      }

      router.refresh();
    });
  }

  if (status !== "pending" && status !== "accepted") {
    return null;
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-slate-900">Acciones del match</h2>

      <div className="mt-4 flex flex-wrap gap-3">
        {canAccept && status === "pending" && (
          <button
            onClick={handleAccept}
            disabled={isPending}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Procesando..." : "Aceptar match"}
          </button>
        )}

        {canCancel && (status === "pending" || status === "accepted") && (
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Procesando..." : "Cancelar match"}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}