"use client";

import { Save, LogOut, Mail, UserRound } from "lucide-react";
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

  const [loadingAction, setLoadingAction] = useState<"save" | "logout" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error" | null>(null);

  const fieldClassName =
    "intra-input min-h-11 rounded-xl border-[#E4E7EC] px-4 text-[14px] leading-[22px] text-[#0B2C4A]";
  const labelClassName = "mb-2 block text-[14px] font-semibold leading-5 text-[#0B2C4A]";
  const isBusy = loadingAction !== null;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("save");
    setMsg(null);
    setMsgType(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoadingAction(null);
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

    setLoadingAction(null);

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
    setLoadingAction("logout");
    setMsg(null);
    setMsgType(null);

    await supabase.auth.signOut();

    setLoadingAction(null);
    router.push("/login");
  };

  return (
    <section className="rounded-[24px] border border-[#E4E7EC] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFFBF4] text-[#2ECC71]">
          <UserRound className="h-5 w-5" strokeWidth={1.9} />
        </div>
        <div>
          <h2 className="text-[18px] font-bold leading-6 text-[#0B2C4A]">Información personal</h2>
          <p className="mt-1 text-[14px] leading-[22px] text-[#667085]">
            Tus datos se usan para tu cuenta y procesos en INTRA.
          </p>
        </div>
      </div>

      <form onSubmit={onSave} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className={labelClassName}>
            Correo
          </label>
          <div className="rounded-xl border border-[#E4E7EC] bg-[#F9FAFB] px-4 py-3 text-[14px] leading-[22px] text-[#0B2C4A]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#667085]" strokeWidth={1.9} />
                <span className="break-all">{email || "Sin correo"}</span>
              </div>
              <span
                className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[12px] font-bold leading-4 ${
                  isEmailVerified
                    ? "bg-[#EFFBF4] text-[#1E8C4E]"
                    : "bg-[#FFF7E8] text-[#D4A017]"
                }`}
              >
                {isEmailVerified ? "Correo verificado" : "Correo pendiente"}
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
            placeholder="Cédula o documento"
          />
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
            placeholder="301 234 5678"
          />
        </div>

        {msg ? (
          <div
            className={`rounded-[18px] border px-4 py-3 text-[14px] leading-[22px] ${
              msgType === "success"
                ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
            }`}
          >
            {msg}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-[#E4E7EC] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            disabled={isBusy}
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#2ECC71] px-5 py-3 text-[14px] font-bold leading-5 text-white transition hover:bg-[#27AE60] disabled:opacity-60"
          >
            <Save className="h-4 w-4" strokeWidth={1.9} />
            {loadingAction === "save" ? "Guardando..." : "Guardar cambios"}
          </button>

          <button
            disabled={isBusy}
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-2xl border border-[#E4E7EC] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#667085] transition hover:bg-[#F9FAFB] disabled:opacity-60 sm:self-auto"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.9} />
            {loadingAction === "logout" ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      </form>
    </section>
  );
}
