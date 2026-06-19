"use client";

import { EllipsisVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cancelPendingPaymentShipmentAction } from "@/app/app/_actions/shipment-actions";
import { IntraConfirmDialog } from "@/components/ui";

type DashboardShipmentCancelMenuProps = {
  shipmentId: string;
};

export default function DashboardShipmentCancelMenu({
  shipmentId,
}: DashboardShipmentCancelMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const handleOpenConfirm = () => {
    setMessage(null);
    setMenuOpen(false);
    setConfirmOpen(true);
  };

  const handleCancelConfirm = () => {
    if (!isPending) {
      setConfirmOpen(false);
    }
  };

  const handleConfirmCancel = () => {
    startTransition(async () => {
      setMessage(null);

      const result = await cancelPendingPaymentShipmentAction(shipmentId);

      if (!result.success) {
        setConfirmOpen(false);
        setMessage({
          tone: "error",
          text: result.error ?? "No pudimos cancelar este envío. Intenta nuevamente.",
        });
        return;
      }

      setConfirmOpen(false);
      setMessage({ tone: "success", text: "Envío cancelado." });
      window.setTimeout(() => router.refresh(), 700);
    });
  };

  return (
    <>
      <div ref={menuRef} className="relative flex shrink-0 flex-col items-end">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          disabled={isPending}
          aria-label="Abrir acciones del envío"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="intra-icon-button h-10 w-10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <EllipsisVertical className="intra-icon-body" aria-hidden="true" />
        </button>

        {menuOpen ? (
          <div role="menu" className="intra-popover-surface absolute right-0 top-11 z-20 min-w-44 overflow-hidden">
            <button
              type="button"
              role="menuitem"
              onClick={handleOpenConfirm}
              disabled={isPending}
              className="intra-label flex min-h-11 w-full items-center justify-center px-4 py-2.5 text-center text-intra-danger transition hover:bg-intra-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar envío
            </button>
          </div>
        ) : null}

        {message ? (
          <p
            className={
              message.tone === "success"
                ? "intra-field-message intra-field-message-success mt-2 max-w-48 text-right"
                : "intra-field-error mt-2 max-w-48 text-right"
            }
            aria-live="polite"
          >
            {message.text}
          </p>
        ) : null}
      </div>

      <IntraConfirmDialog
        open={confirmOpen}
        title="¿Cancelar este envío?"
        description="Como aún no has pagado, no se hará ningún cobro. El envío dejará de estar activo."
        confirmLabel="Cancelar envío"
        cancelLabel="Volver"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleConfirmCancel}
        onCancel={handleCancelConfirm}
      />
    </>
  );
}
