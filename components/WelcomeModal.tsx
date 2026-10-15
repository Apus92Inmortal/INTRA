"use client";

import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useModalFocus } from "@/lib/ui/use-modal-focus";

type Props = {
  userId: string;
  initialOpen: boolean;
};

export default function WelcomeModal({ userId, initialOpen }: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [loading, setLoading] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  const supabase = createClient();
  const router = useRouter();

  const hideModalForever = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ show_welcome_modal: false })
      .eq("id", userId);

    if (error) {
      console.error("Error ocultando welcome modal:", error.message);
      return false;
    }

    return true;
  };

  const handleClose = async () => {
    setLoading(true);

    const ok = await hideModalForever();

    if (ok) {
      setOpen(false);
    }

    setLoading(false);
  };

  const handleCompleteProfile = async () => {
    setLoading(true);

    const ok = await hideModalForever();

    if (ok) {
      setOpen(false);
      router.push("/app/profile");
    }

    setLoading(false);
  };

  const panelRef = useModalFocus({ open, onDismiss: loading ? undefined : handleClose });

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="intra-modal-backdrop p-4">
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="intra-modal-panel w-full max-w-md p-6">
        <h2 id={titleId} className="intra-h2 text-intra-blue">
          Bienvenido a INTRA
        </h2>

        <p id={descriptionId} className="mt-3 intra-body text-intra-text-subtle">
          Estás a un paso de empezar en INTRA. Completa tu perfil para publicar envíos,
          ofrecer espacio en tus viajes y conectar con otros usuarios.
        </p>

        <p className="mt-2 intra-caption text-intra-text-muted/70">
          Te tomará menos de un minuto.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleCompleteProfile}
            disabled={loading}
            className="intra-btn flex-1 bg-intra-blue px-4 py-3 text-center text-intra-card hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Abriendo perfil..." : "Completar perfil"}
          </button>

          <button
            onClick={handleClose}
            disabled={loading}
            className="intra-btn flex-1 border border-intra-border-soft bg-intra-card px-4 py-3 text-intra-blue hover:bg-intra-bg-app disabled:opacity-50"
          >
            {loading ? "Cerrando..." : "Ahora no"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
