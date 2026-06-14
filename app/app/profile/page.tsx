import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppNavbar } from "@/components/app-navbar";
import ProfileForm from "./ProfileForm";
import VerificationPanel from "./VerificationPanel";

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  const source = name?.trim() || email?.split("@")[0] || "INTRA";
  const parts = source.split(/\s+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getVerificationLabel(status: string | null | undefined) {
  switch (status) {
    case "verified":
      return "Cuenta verificada";
    case "pending":
      return "En revisión";
    case "rejected":
      return "Requiere corrección";
    default:
      return "Pendiente";
  }
}

function getVerificationBadgeClass(status: string | null | undefined) {
  switch (status) {
    case "verified":
      return "border-intra-success-border bg-intra-success-soft text-intra-text-success";
    case "pending":
      return "border-intra-warning-border bg-intra-warning-soft text-intra-warning-text";
    case "rejected":
      return "border-intra-danger-border bg-intra-danger-soft text-intra-danger";
    default:
      return "border-intra-border-soft bg-intra-neutral-pill text-intra-blue";
  }
}

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, document_number, city_id")
    .eq("id", user.id)
    .single();

  const { data: cities, error: citiesError } = await supabase
    .from("cities")
    .select("id, name, department")
    .order("name", { ascending: true });

  const { data: verification, error: verificationError } = await supabase
    .from("user_verifications")
    .select("verification_status, rejection_reason, reviewed_at, document_photo_url, selfie_url")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Error cargando perfil: ${error.message}`);
  }

  if (citiesError) {
    throw new Error(`Error cargando ciudades del perfil: ${citiesError.message}`);
  }

  if (verificationError) {
    throw new Error(`Error cargando verificación del perfil: ${verificationError.message}`);
  }

  const displayName = profile?.full_name?.trim() || "Completa tu nombre";
  const email = user.email ?? "";
  const verificationStatus = verification?.verification_status ?? null;
  const initials = getInitials(profile?.full_name, email);

  return (
    <>
      <AppNavbar />

      <main className="intra-page-shell px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <header>
            <h1 className="intra-h1">Mi perfil</h1>
            <p className="intra-body mt-1">
              Actualiza tus datos y verifica tu identidad.
            </p>
          </header>

          <section className="intra-card-compact p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-intra-neutral-soft-alt intra-h3 text-intra-blue">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="intra-h3 break-words">{displayName}</h2>
                  <p className="intra-body mt-1 break-all">{email || "Sin correo"}</p>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <span
                  className={`intra-pill intra-badge-text border ${
                    user.email_confirmed_at
                      ? "border-intra-success-border bg-intra-success-soft text-intra-text-success"
                      : "border-intra-warning-border bg-intra-warning-soft text-intra-warning-text"
                  }`}
                >
                  {user.email_confirmed_at ? "Correo verificado" : "Correo pendiente"}
                </span>
                <span className={`intra-pill intra-badge-text border ${getVerificationBadgeClass(verificationStatus)}`}>
                  {getVerificationLabel(verificationStatus)}
                </span>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.96fr)] lg:items-start">
            <ProfileForm
              initialFullName={profile?.full_name ?? ""}
              initialPhone={profile?.phone ?? ""}
              initialDocumentNumber={profile?.document_number ?? ""}
              initialCityId={profile?.city_id ?? ""}
              email={user.email ?? ""}
              isEmailVerified={Boolean(user.email_confirmed_at)}
              cities={cities ?? []}
            />

            <div className="lg:sticky lg:top-24">
              <VerificationPanel
                initialStatus={verification?.verification_status ?? null}
                initialRejectionReason={verification?.rejection_reason ?? null}
                hasDocumentPhoto={Boolean(verification?.document_photo_url)}
                hasSelfie={Boolean(verification?.selfie_url)}
                reviewedAt={verification?.reviewed_at ?? null}
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
