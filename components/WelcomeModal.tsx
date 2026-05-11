"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
  initialOpen: boolean;
};

export default function WelcomeModal({ userId, initialOpen }: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [loading, setLoading] = useState(false);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-intra-blue/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-intra-card p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-intra-blue">
          Bienvenido a INTRA 
        </h2>

        <p className="mt-3 text-sm leading-6 text-intra-text-subtle">
          Estás a un paso de empezar en INTRA. Completa tu perfil para publicar envíos,
          ofrecer espacio en tus viajes y conectar con otros usuarios.
        </p>

        <p className="mt-2 text-xs text-intra-text-muted/70">
          Te tomará menos de un minuto.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleCompleteProfile}
            disabled={loading}
            className="flex-1 rounded-xl bg-intra-blue px-4 py-3 text-center text-sm font-medium text-intra-card transition hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Abriendo perfil..." : "Completar perfil"}
          </button>

          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-intra-border-soft bg-intra-card px-4 py-3 text-sm font-medium text-intra-blue transition hover:bg-intra-bg-app disabled:opacity-50"
          >
            {loading ? "Cerrando..." : "Ahora no"}
          </button>
        </div>
      </div>
    </div>
  );
}