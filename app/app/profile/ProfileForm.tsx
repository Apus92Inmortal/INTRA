"use client";

import { LogOut, Mail, Save, UserRound } from "lucide-react";
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
    "intra-input min-h-11 rounded-[var(--intra-radius-xs)]";
  const labelClassName = "mb-2 block intra-caption-strong";
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
    <section className="intra-card p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--intra-radius-xs)] bg-intra-success-soft text-intra-green">
          <UserRound className="intra-icon-lg" strokeWidth={1.9} />
        </div>
        <div>
          <h2 className="intra-h3">Información personal</h2>
          <p className="intra-body mt-1">Completa tus datos básicos.</p>
        </div>
      </div>

      <form onSubmit={onSave} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className={labelClassName}>
            Correo
          </label>
          <div className="rounded-[var(--intra-radius-xs)] border border-intra-border-soft bg-intra-bg-app px-4 py-3 intra-body text-intra-blue">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Mail className="intra-icon-sm text-intra-text-muted" strokeWidth={1.9} />
                <span className="break-all">{email || "Sin correo"}</span>
              </div>
              <span
                className={`intra-pill intra-badge-text w-fit border ${
                  isEmailVerified
                    ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                    : "border-intra-warning-border bg-intra-warning-soft text-intra-warning-text"
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
            className={`rounded-[var(--intra-radius-xs)] border px-4 py-3 intra-body ${
              msgType === "success"
                ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                : "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
            }`}
          >
            {msg}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-intra-border-soft pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            disabled={isBusy}
            type="submit"
            className="intra-btn intra-btn-primary w-full sm:w-auto"
          >
            <Save className="intra-icon-sm" strokeWidth={1.9} />
            {loadingAction === "save" ? "Guardando..." : "Guardar cambios"}
          </button>

          <button
            disabled={isBusy}
            type="button"
            onClick={onLogout}
            className="intra-btn intra-btn-secondary w-full text-intra-text-muted sm:w-auto"
          >
            <LogOut className="intra-icon-sm" strokeWidth={1.9} />
            {loadingAction === "logout" ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </div>
      </form>
    </section>
  );
}
