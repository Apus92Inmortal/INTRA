"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialFullName: string;
  initialPhone: string;
  initialDocumentNumber: string;
  initialCityId: string;
  email: string;
  isEmailVerified: boolean;
  cities: Array<{
    id: string;
    name: string;
    department: string;
  }>;
};

export default function ProfileForm({
  initialFullName,
  initialPhone,
  initialDocumentNumber,
  initialCityId,
  email,
  isEmailVerified,
  cities,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [documentNumber, setDocumentNumber] = useState(initialDocumentNumber);
  const [cityId, setCityId] = useState(initialCityId);

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
        document_number: documentNumber.trim() || null,
        city_id: cityId || null,
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
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Correo
          </label>
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="break-all">{email || "Sin correo"}</span>
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  isEmailVerified
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {isEmailVerified ? "Correo verificado" : "Correo pendiente por verificar"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="fullName"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Nombre completo
          </label>
          <input
            id="fullName"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-800 outline-none transition focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Escribe tu nombre completo"
          />
        </div>

        <div>
          <label
            htmlFor="documentNumber"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Documento de identidad
          </label>
          <input
            id="documentNumber"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-800 outline-none transition focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="Cédula o documento de identidad"
          />
          <p className="mt-2 text-xs text-gray-500">
            Este dato se usa como base para la verificación manual de identidad.
          </p>
        </div>

        <div>
          <label
            htmlFor="cityId"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Ciudad base
          </label>
          <select
            id="cityId"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-800 outline-none transition focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
            value={cityId}
            onChange={(e) => setCityId(e.target.value)}
          >
            <option value="">Selecciona una ciudad</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name} ({city.department})
              </option>
            ))}
          </select>
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
            type="tel"
            inputMode="tel"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-800 outline-none transition focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/10"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        <div className="rounded-2xl bg-[#EEF2F7] px-4 py-3 text-sm leading-6 text-slate-600">
          En INTRA no te fijamos un rol permanente. Puedes publicar envíos y también
          publicar viajes según lo que necesites en cada momento.
        </div>

        <div className="rounded-2xl border border-[#D9E7F2] bg-[#F7FAFC] px-4 py-3 text-sm leading-6 text-slate-600">
          Por ahora la verificación de identidad es manual. Más abajo puedes subir
          documento y selfie para revisión del equipo.
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
