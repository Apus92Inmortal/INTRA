import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppNavbar } from "@/components/app-navbar";
import ProfileForm from "./ProfileForm";

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

  if (error) {
    throw new Error(`Error cargando perfil: ${error.message}`);
  }

  if (citiesError) {
    throw new Error(`Error cargando ciudades del perfil: ${citiesError.message}`);
  }

  return (
    <>
      <AppNavbar />

      <main className="min-h-screen bg-[#EEF2F7]">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#0B2C4A]">Mi perfil</h1>
            <p className="mt-2 text-sm text-gray-600">
              Edita tu información personal y mantén tus datos actualizados en INTRA.
            </p>
          </div>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <ProfileForm
              initialFullName={profile?.full_name ?? ""}
              initialPhone={profile?.phone ?? ""}
              initialDocumentNumber={profile?.document_number ?? ""}
              initialCityId={profile?.city_id ?? ""}
              email={user.email ?? ""}
              isEmailVerified={Boolean(user.email_confirmed_at)}
              cities={cities ?? []}
            />
          </section>
        </div>
      </main>
    </>
  );
}
