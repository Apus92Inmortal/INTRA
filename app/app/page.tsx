import Link from "next/link";
import { AppNavbar } from "@/components/app-navbar";
import WelcomeModal from "@/components/WelcomeModal";
import { createClient } from "@/lib/supabase/server";

export default async function AppHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <div className="p-10">No autorizado</div>;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, phone, show_welcome_modal")
    .eq("id", user.id)
    .single();

  return (
    <>
      <AppNavbar />

      <WelcomeModal
        userId={user.id}
        initialOpen={profile?.show_welcome_modal ?? false}
      />

      <main className="min-h-screen bg-[#EEF2F7] p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#0B2C4A]">
                Bienvenido{profile?.full_name ? `, ${profile.full_name}` : ""}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona tus envíos y viajes en INTRA
              </p>
            </div>

            <Link
              className="self-start md:self-auto rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0B2C4A] hover:bg-gray-200 transition"
              href="/app/profile"
            >
              Mi perfil
            </Link>
          </div>

          {/* INFO CARD */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Email</span>
                <p className="font-medium">{user.email}</p>
              </div>

              <div>
                <span className="text-gray-500">Rol</span>
                <p className="font-medium">
                  {profile?.role ?? "No definido"}
                </p>
              </div>

              <div>
                <span className="text-gray-500">Teléfono</span>
                <p className="font-medium">
                  {profile?.phone ?? "No definido"}
                </p>
              </div>
            </div>
          </div>

          {/* ACCIONES PRINCIPALES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/app/shipments/new"
              className="bg-[#0B2C4A] text-white rounded-2xl p-6 hover:scale-[1.02] transition"
            >
              <h3 className="text-lg font-semibold">Crear envío</h3>
              <p className="text-sm text-white/90 mt-1">
                Publica un paquete para enviarlo con un viajero
              </p>
            </Link>

            <Link
              href="/app/trips/new"
              className="bg-[#2ECC71] border border-gray-200 rounded-2xl p-6 hover:scale-[1.02] hover:bg-[#2ECC71] transition"
            >
              <h3 className="text-lg font-semibold text-white">
                Publicar viaje
              </h3>
              <p className="text-sm text-white/90 mt-1">
                Ofrece espacio en tu viaje para transportar paquetes
              </p>
            </Link>

            <Link
              href="/app/market"
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:scale-[1.02] hover:bg-gray-200 transition"
            >
              <h3 className="text-lg font-semibold text-[#0B2C4A]">
                Explorar market
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Encuentra envíos o viajes disponibles
              </p>
            </Link>

            <Link
              href="/app/matches"
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:scale-[1.02] hover:bg-gray-200 transition"
            >
              <h3 className="text-lg font-semibold text-[#0B2C4A]">
                Mis matches
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona tus solicitudes y conversaciones
              </p>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
