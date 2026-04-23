import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Borrador anterior de Joy",
  robots: {
    index: false,
    follow: false,
  },
};

export default function JoyOriginalDraftPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-white to-gray-400 p-6">
      <div className="mx-auto mt-12 w-full max-w-4xl rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg backdrop-blur sm:p-8">
        <div className="mb-6 rounded-2xl border border-[#0B2C4A]/10 bg-[#0B2C4A]/5 p-4 text-sm text-[#0B2C4A]">
          Borrador archivado de la landing anterior de Joy. La versión activa ahora vive en <Link href="/" className="font-semibold underline">la página principal</Link>.
        </div>

        <div className="flex flex-col items-center gap-3 pt-6 text-center">
          <Image
            src="/logo.png"
            alt="INTRA Logo"
            width={920}
            height={780}
            priority
            className="-mb-2 h-auto w-full max-w-[540px]"
          />

          <p className="text-xl font-semibold text-[#0B2C4A]/80">
            Conecta con viajeros y envía tus paquetes sin complicaciones
          </p>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-8">
            <Link
              href="/login"
              className="rounded-xl bg-gray-200 px-5 py-3 font-semibold text-gray-900 transition hover:scale-105 hover:bg-gray-300"
            >
              Iniciar sesión
            </Link>

            <Link
              href="/register"
              className="rounded-xl bg-[#0B2C4A] px-5 py-3 font-semibold text-white transition hover:scale-105 hover:bg-green-700"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </div>

      <footer className="mb-2 text-sm text-slate-800">© 2026 INTRA</footer>
    </main>
  );
}
