import Link from "next/link";
import { AppNavbar } from "@/components/app-navbar";
import WelcomeModal from "@/components/WelcomeModal";
import { createClient } from "@/lib/supabase/server";
import AuthGateway from "./AuthGateway";

type AppHomePageProps = {
  searchParams?: Promise<{
    tab?: string;
    error?: string;
    next?: string;
  }>;
};

export default async function AppHomePage({ searchParams }: AppHomePageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const tab = resolvedSearchParams?.tab === "register" ? "register" : "login";
    const nextPath = resolvedSearchParams?.next?.startsWith("/")
      ? resolvedSearchParams.next
      : null;

    return (
      <AuthGateway
        initialTab={tab}
        initialError={resolvedSearchParams?.error ?? null}
        nextPath={nextPath}
      />
    );
  }

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
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#0B2C4A]">
                Bienvenido{profile?.full_name ? `, ${profile.full_name}` : ""}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Gestiona tus envíos y viajes en INTRA
              </p>
            </div>

            <Link
              className="self-start rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#0B2C4A] transition hover:bg-gray-200 md:self-auto"
              href="/app/profile"
            >
              Mi perfil
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
              <div>
                <span className="text-gray-500">Email</span>
                <p className="font-medium">{user.email}</p>
              </div>

              <div>
                <span className="text-gray-500">Rol</span>
                <p className="font-medium">{profile?.role ?? "No definido"}</p>
              </div>

              <div>
                <span className="text-gray-500">Teléfono</span>
                <p className="font-medium">{profile?.phone ?? "No definido"}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link
              href="/app/shipments/new"
              className="rounded-2xl bg-[#0B2C4A] p-6 text-white transition hover:scale-[1.02]"
            >
              <h3 className="text-lg font-semibold">Crear envío</h3>
              <p className="mt-1 text-sm text-white/90">
                Publica un paquete para enviarlo con un viajero
              </p>
            </Link>

            <Link
              href="/app/trips/new"
              className="rounded-2xl border border-gray-200 bg-[#2ECC71] p-6 transition hover:scale-[1.02] hover:bg-[#2ECC71]"
            >
              <h3 className="text-lg font-semibold text-white">Publicar viaje</h3>
              <p className="mt-1 text-sm text-white/90">
                Ofrece espacio en tu viaje para transportar paquetes
              </p>
            </Link>

            <Link
              href="/app/market"
              className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:scale-[1.02] hover:bg-gray-200"
            >
              <h3 className="text-lg font-semibold text-[#0B2C4A]">
                Explorar market
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Encuentra envíos o viajes disponibles
              </p>
            </Link>

            <Link
              href="/app/matches"
              className="rounded-2xl border border-gray-200 bg-white p-6 transition hover:scale-[1.02] hover:bg-gray-200"
            >
              <h3 className="text-lg font-semibold text-[#0B2C4A]">
                Mis matches
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Gestiona tus solicitudes y conversaciones
              </p>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
