import { AppNavbar } from "@/components/app-navbar";
import { createClient } from "@/lib/supabase/server"

export default async function AppHomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div className="p-10">No autorizado</div>

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, phone")
    .eq("id", user.id)
    .single()

  return (
    <main className="p-10 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Zona privada /app 🔒</h1>
          <p className="mt-2 text-sm opacity-80">
            Bienvenido{profile?.full_name ? `, ${profile.full_name}` : ""}.
          </p>
        </div>

        <a className="rounded-md border px-4 py-2" href="/app/profile">
          Mi perfil
        </a>
      </div>

      <div className="mt-8 rounded-xl border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <b>Email:</b> {user.email}
          </div>
          <div>
            <b>Rol:</b> {profile?.role ?? "No definido"}
          </div>
          <div>
            <b>Telefono:</b> {profile?.phone ?? "No definido"}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            className="rounded-md bg-black text-white px-4 py-2"
            href="/app/shipments/new"
          >
            Crear envio
          </a>

          <a className="rounded-md border px-4 py-2" href="/app/trips/new">
            Publicar viaje
          </a>

          <a className="rounded-md border px-4 py-2" href="/app/market">
            Ir a market
          </a>

          <a className="rounded-md border px-4 py-2" href="/app/matches">
            Mis matches
          </a>
        </div>
      </div>

      <p className="mt-6 text-sm opacity-80">
        Tip: Si acabas de registrarte, completa tu perfil y luego crea un envio o publica un viaje.
      </p>
    </main>
  )
}
