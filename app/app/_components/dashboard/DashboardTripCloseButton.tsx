"use client";

import { Lock, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { closeTripAction } from "@/app/app/_actions/trip-actions";

export default function DashboardTripCloseButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleClick = () => {
    const confirmed = window.confirm(
      "¿Cerrar este viaje a nuevas solicitudes? Los matches pendientes se cancelarán automáticamente."
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      setError(null);
      setIsOpen(false);

      const result = await closeTripAction(tripId);

      if (!result.success) {
        setError(result.error ?? "No pudimos cerrar el viaje.");
        return;
      }

      router.refresh();
    });
  };

  return (
    <div ref={menuRef} className="relative flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={isPending}
        aria-label="Abrir acciones del viaje"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#0B2C4A]/10 bg-white text-[#0B2C4A] transition hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:w-9"
      >
        <MoreVertical className="intra-icon-body" />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-20 min-w-[180px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <button
            type="button"
            onClick={handleClick}
            disabled={isPending}
            className="intra-label flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2.5 text-center text-[#0B2C4A] transition hover:bg-[#EEF2F7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Lock className="intra-icon-body" />
            {isPending ? "Cerrando..." : "Despegando"}
          </button>
        </div>
      ) : null}

      {error ? <p className="intra-caption text-red-600">{error}</p> : null}
    </div>
  );
}
