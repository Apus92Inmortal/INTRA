import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 p-6">
      
      <h1 className="text-4xl font-bold">INTRA </h1>
      
      <p className="text-gray-600 text-center max-w-md">
        Plataforma para enviar paquetes aprovechando viajeros.
      </p>

      <div className="flex gap-4 mt-4">
        
        <Link
          href="/login"
          className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          Iniciar sesión
        </Link>

        <Link
          href="/register"
          className="px-6 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition"
        >
          Registrarse
        </Link>

      </div>

    </main>
  );
}