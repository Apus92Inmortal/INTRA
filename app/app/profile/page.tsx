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

      <main className="intra-page-shell px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <header>
            <h1 className="text-[28px] font-bold leading-[34px] text-[#0B2C4A]">Mi perfil</h1>
            <p className="mt-1 text-[14px] leading-[22px] text-[#667085]">
              Mantén tus datos actualizados y completa tu verificación para operar con más confianza en INTRA.
            </p>
          </header>

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
