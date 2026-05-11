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
  const fieldClassName = "intra-input";
  const labelClassName = "mb-2 block text-sm font-medium text-intra-blue";

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
        <h2 className="text-xl font-semibold text-intra-blue">
          Información personal
        </h2>
        <p className="mt-1 text-sm text-intra-text-subtle">
          Actualiza los datos que verán otros usuarios dentro de la plataforma.
        </p>
      </div>

      <form onSubmit={onSave} className="space-y-5">
        <div>
          <label htmlFor="email" className={labelClassName}>
            Correo
          </label>
          <div className="rounded-2xl border border-intra-border-soft bg-intra-bg-app px-4 py-3 text-sm text-intra-blue">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="break-all">{email || "Sin correo"}</span>
              <span
                className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                  isEmailVerified
                    ? "bg-intra-success-soft text-intra-text-success"
                    : "bg-intra-warning-soft text-intra-warning-text"
                }`}
              >
                {isEmailVerified ? "Correo verificado" : "Correo pendiente por verificar"}
              </span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="fullName" className={labelClassName}>
            Nombre completo
          </label>
          <input
            id="fullName"
            className={fieldClassName}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Escribe tu nombre completo"
          />
        </div>

        <div>
          <label htmlFor="documentNumber" className={labelClassName}>
            Documento de identidad
          </label>
          <input
            id="documentNumber"
            className={fieldClassName}
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="Cédula o documento de identidad"
          />
          <p className="mt-2 text-xs text-intra-text-subtle">
            Este dato se usa como base para la verificación manual de identidad.
          </p>
        </div>

        <div>
          <label htmlFor="cityId" className={labelClassName}>
            Ciudad base
          </label>
          <select
            id="cityId"
            className={fieldClassName}
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
          <label htmlFor="phone" className={labelClassName}>
            Teléfono
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            className={fieldClassName}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        {msg && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              msgType === "success"
                ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
            }`}
          >
            {msg}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            disabled={loading}
            type="submit"
            className="intra-btn intra-btn-primary h-12 px-5 text-sm"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>

          <button
            disabled={loading}
            type="button"
            onClick={onLogout}
            className="intra-btn intra-btn-secondary h-12 px-5 text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </form>
    </div>
  );
}
