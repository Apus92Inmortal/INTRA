"use client";

import { Lock, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { closeTripAction } from "@/app/app/_actions/trip-actions";

export default function DashboardTripCloseButton({ tripId }: { tripId: string }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
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

      {showCloseModal && typeof document !== "undefined"
        ? createPortal(
            <div
              className="intra-modal-backdrop p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="trip-close-confirm-title"
              onMouseDown={(event) => {
                if (!modalRef.current?.contains(event.target as Node)) {
                  handleCancelCloseModal();
                }
              }}
            >
              <div ref={modalRef} className="intra-modal-panel w-full max-w-sm p-5">
                <h3 id="trip-close-confirm-title" className="intra-h3 text-intra-blue">
                  Cerrar viaje
                </h3>
                <p className="mt-2 intra-body text-intra-text-subtle">
                  Los matches pendientes se cancelarán automáticamente.
                </p>

                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCancelCloseModal}
                    className="intra-btn border border-intra-border-soft px-4 py-2 intra-body-strong text-intra-blue hover:bg-intra-bg-app"
                    disabled={isPending}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCloseTrip}
                    className="intra-btn bg-intra-danger px-4 py-2 intra-body-strong text-intra-card hover:opacity-95 disabled:opacity-60"
                    disabled={isPending}
                  >
                    {isPending ? "Cerrando" : "Cerrar viaje"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
