"use client";

import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { closeTripAction } from "@/app/app/_actions/trip-actions";

export default function DashboardTripCloseButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    const confirmed = window.confirm(
      "¿Cerrar este viaje a nuevas solicitudes? Los matches pendientes se cancelarán automáticamente."
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setError(null);

      const result = await closeTripAction(tripId);

      if (!result.success) {
        setError(result.error ?? "No pudimos cerrar el viaje.");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#0B2C4A]/10 bg-white px-3 py-2 text-sm font-semibold text-[#0B2C4A] transition hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Lock className="h-4 w-4" />
        {isPending ? "Cerrando..." : "Despegando"}
      </button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
