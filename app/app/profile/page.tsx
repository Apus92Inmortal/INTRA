import { createClient } from "@/lib/supabase/server"
import ProfileForm from "./ProfileForm"

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div className="p-10">No autorizado</div>

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role")
    .eq("id", user.id)
    .single()

  if (error) {
    return <div className="p-10">Error cargando perfil: {error.message}</div>
  }

  return (
    <main className="p-10 max-w-xl">
      <h1 className="text-3xl font-bold">Mi perfil</h1>
      <p className="mt-2 text-sm opacity-80">
        Edita tus datos. RLS asegura que solo tú puedes ver/editar tu perfil.
      </p>

      <div className="mt-6">
        <ProfileForm
          initialFullName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
          initialRole={profile?.role ?? ""}
        />
      </div>
    </main>
  )
}
