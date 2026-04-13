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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-[#0B2C4A]">
          Bienvenido a INTRA 
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Estás a un paso de empezar en INTRA. Completa tu perfil para publicar envíos,
          ofrecer espacio en tus viajes y conectar con otros usuarios.
        </p>

        <p className="mt-2 text-xs text-gray-400">
          Te tomará menos de un minuto.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleCompleteProfile}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#0B2C4A] px-4 py-3 text-center text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-50"
          >
            {loading ? "Abriendo perfil..." : "Completar perfil"}
          </button>

          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#0B2C4A] transition hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Cerrando..." : "Ahora no"}
          </button>
        </div>
      </div>
    </div>
  );
}