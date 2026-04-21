import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-white to-gray-400 p-6">

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex flex-col items-center gap-3 mt-20">
        
        <Image
          src="/logo.png"
          alt="INTRA Logo"
          width={920}
          height={780}
          priority
          className="-mb-2"
        />

        <p className="text-[#0B2C4A]/500 text-xl font-semibold text-center">
          Conecta con viajeros y envía tus paquetes sin complicaciones
        </p>

        <div className="flex gap-8 mt-4">
          <Link
            href="/login"
            className="px-5 py-3 rounded-xl bg-gray-200 text-gray-1000 font-semibold hover:bg-gray-400 hover:scale-105 transition"
          >
            Iniciar sesión
          </Link>

          <Link
            href="/register"
            className="px-5 py-3 rounded-xl bg-[#0B2C4A] text-white font-semibold hover:bg-green-700 hover:scale-105 transition"
          >
            Registrarse
          </Link>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="text-sm text-black-1000 text-s mb-2">
        © 2026 INTRA 
      </footer>

    </main>
  );
}