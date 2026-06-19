"use client";

import { Lock, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { closeTripAction } from "@/app/app/_actions/trip-actions";
import { IntraConfirmDialog } from "@/components/ui";

export default function DashboardTripCloseButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
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

  useEffect(() => {
    if (!showCloseModal) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) {
        setShowCloseModal(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isPending, showCloseModal]);

  const handleOpenCloseModal = () => {
    setIsOpen(false);
    setShowCloseModal(true);
  };

  const handleCancelCloseModal = () => {
    if (!isPending) {
      setShowCloseModal(false);
    }
  };

  const handleConfirmCloseTrip = () => {
    startTransition(async () => {
      setError(null);
      setIsOpen(false);
      setShowCloseModal(false);

      const result = await closeTripAction(tripId);

      if (!result.success) {
        setError(result.error ?? "No pudimos cerrar el viaje.");
        return;
      }

      router.refresh();
    });
  };

  return (
    <>
      <div ref={menuRef} className="relative flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          disabled={isPending}
          aria-label="Abrir acciones del viaje"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className="intra-icon-button h-10 w-10 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:w-9"
        >
          <MoreVertical className="intra-icon-body" />
        </button>

        {isOpen ? (
          <div className="intra-popover-surface absolute right-0 top-12 z-20 min-w-[180px] overflow-hidden">
            <button
              type="button"
              onClick={handleOpenCloseModal}
              disabled={isPending}
              className="intra-label flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2.5 text-center text-intra-blue transition hover:bg-intra-neutral-pill disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Lock className="intra-icon-body" />
              {isPending ? "Cerrando..." : "Despegando"}
            </button>
          </div>
        ) : null}

        {error ? <p className="intra-field-error max-w-44 text-right">{error}</p> : null}
      </div>

      <IntraConfirmDialog
        open={showCloseModal}
        title="Cerrar viaje"
        description="Los matches pendientes se cancelarán automáticamente."
        confirmLabel={isPending ? "Cerrando" : "Cerrar viaje"}
        cancelLabel="Cancelar"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleConfirmCloseTrip}
        onCancel={handleCancelCloseModal}
      />
    </>
  );
}
