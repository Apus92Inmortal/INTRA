"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClient()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMsg(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        setLoading(false)

        if (error) {
            setMsg("❌ " + error.message)
            return
        }

        router.push("/app")
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-400 p-6">
            
            <div className="w-full max-w-md rounded-2xl shadow-lg bg-white p-8 relative">

                {/* BOTÓN VOLVER (DENTRO DEL CARD) */}
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="absolute top-5 left-5 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#0B2C4A] hover:bg-gray-200 transition"
                >
                    Volver
                </button>

                {/* LOGO */}
                <div className="flex justify-center mb-0">
                    <Image
                        src="/logo.png"
                        alt="INTRA Logo"
                        width={260}
                        height={160}
                    />
                </div>

                {/* TITULO */}
                <h1 className="text-2xl font-bold text-center text-[#0B2C4A]">
                    Inicia sesión
                </h1>

                <p className="mt-2 text-sm text-center text-gray-600">
                    Accede para continuar en INTRA
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">

                    {/* EMAIL */}
                    <div>
                        <label className="text-sm text-[#0B2C4A] font-medium">
                            Email
                        </label>
                        <input
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B2C4A]"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="tu@email.com"
                        />
                    </div>

                    {/* PASSWORD */}
                    <div>
                        <label className="text-sm text-[#0B2C4A] font-medium">
                            Contraseña
                        </label>
                        <input
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B2C4A]"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="tu contraseña"
                        />
                    </div>

                    {/* MENSAJE ERROR */}
                    {msg && (
                        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-600">
                            {msg}
                        </div>
                    )}

                    {/* BOTÓN */}
                    <button
                        disabled={loading}
                        className="w-full rounded-xl bg-[#0B2C4A] text-white py-2 font-semibold hover:scale-105 transition disabled:opacity-60"
                        type="submit"
                    >
                        {loading ? "Entrando..." : "Entrar"}
                    </button>

                    {/* LINK REGISTER */}
                    <p className="text-sm text-center text-gray-500">
                        ¿No tienes cuenta?{" "}
                        <a
                            className="text-[#0B2C4A] font-semibold hover:underline"
                            href="/register"
                        >
                            Regístrate
                        </a>
                    </p>

                </form>
            </div>

        </main>
    )
}