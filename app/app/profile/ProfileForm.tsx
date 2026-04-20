"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialFullName: string;
  initialPhone: string;
  initialRole: string;
};

export default function ProfileForm({
  initialFullName,
  initialPhone,
  initialRole,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [role, setRole] = useState(initialRole);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error" | null>(null);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setMsgType(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setMsg("No estás autenticado.");
      setMsgType("error");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: role.trim() || null,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      setMsg(`Error guardando: ${error.message}`);
      setMsgType("error");
      return;
    }

    setMsg("Perfil actualizado correctamente.");
    setMsgType("success");
    router.refresh();
  };

  const onLogout = async () => {
    setLoading(true);
    setMsg(null);
    setMsgType(null);

    await supabase.auth.signOut();

    setLoading(false);
    router.push("/login");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#0B2C4A]">
          Información personal
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Actualiza los datos que verán otros usuarios dentro de la plataforma.
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-5">
        <div>
          <label
            htmlFor="fullName"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Nombre completo
          </label>
          <input
            id="fullName"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Escribe tu nombre completo"
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Teléfono
          </label>
          <input
            id="phone"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div>
          <label
            htmlFor="role"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Rol
          </label>
          <input
            id="role"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Ej: cliente, viajero"
          />
        </div>

        {msg && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              msgType === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {msg}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            disabled={loading}
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>

          <button
            disabled={loading}
            type="button"
            onClick={onLogout}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cerrar sesión
          </button>
        </div>
      </form>
    </div>
  );
}
