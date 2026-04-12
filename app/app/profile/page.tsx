import { createClient } from "@/lib/supabase/server";
import { AppNavbar } from "@/components/app-navbar";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-10">No autorizado</div>;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", user.id)
    .single();

  if (error) {
    return (
      <>
        <AppNavbar />
        <main className="min-h-screen bg-[#EEF2F7]">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
            <div className="rounded-2xl border border-red-200 bg-white p-6 text-red-600 shadow-sm">
              Error cargando perfil: {error.message}
            </div>
          </div>
        </main>
      </>
    );
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
              initialRole={profile?.role ?? ""}
            />
          </section>
        </div>
      </main>
    </>
  );
}