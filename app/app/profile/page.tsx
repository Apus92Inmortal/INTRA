import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppNavbar } from "@/components/app-navbar";
import ProfileForm from "./ProfileForm";
import VerificationPanel from "./VerificationPanel";

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

  return (
    <>
      <AppNavbar />

      <main className="intra-page-shell px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="intra-page-title text-3xl">Mi perfil</h1>
            <p className="mt-2 text-sm text-intra-text-subtle">
              Edita tu información personal y mantén tus datos actualizados en INTRA.
            </p>
          </div>

          <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="intra-card p-6 sm:p-8">
              <ProfileForm
                initialFullName={profile?.full_name ?? ""}
                initialPhone={profile?.phone ?? ""}
                initialDocumentNumber={profile?.document_number ?? ""}
                initialCityId={profile?.city_id ?? ""}
                email={user.email ?? ""}
                isEmailVerified={Boolean(user.email_confirmed_at)}
                cities={cities ?? []}
              />
            </div>

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
