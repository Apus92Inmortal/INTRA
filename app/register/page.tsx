"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

export default function RegisterPage() {
    const router = useRouter()
    const supabase = createClient()

    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMsg(null)

        // 1) Crear usuario
        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        })

        if (signUpError) {
            setLoading(false)
            setMsg("❌ " + signUpError.message)
            return
        }

        // 2) Iniciar sesión
        const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
                email,
                password,
            })

        if (signInError) {
            setLoading(false)
            setMsg("❌ Cuenta creada, pero no pude iniciar sesión: " + signInError.message)
            return
        }

        const userId = signInData.user?.id

        if (!userId) {
            setLoading(false)
            setMsg("❌ No pude obtener el usuario después del login.")
            return
        }

        // 3) Guardar nombre en perfil
        const { error: profileError } = await supabase
            .from("profiles")
            .update({ full_name: fullName })
            .eq("id", userId)

        if (profileError) {
            setLoading(false)
            setMsg("❌ No pude guardar el nombre: " + profileError.message)
            return
        }

        setLoading(false)
        router.push("/app")
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-400 p-6">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
                
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="absolute top-5 left-5 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#0B2C4A] hover:bg-gray-200 transition"
                >
                    Volver
                </button>

                <div className="flex justify-center mb-0">
                    <Image
                        src="/logo.png"
                        alt="INTRA Logo"
                        width={260}
                        height={160}
                    />
                </div>

                <h1 className="text-2xl font-bold text-center text-[#0B2C4A]">
                    Crear cuenta
                </h1>

                <p className="mt-2 text-sm text-center text-gray-600">
                    Regístrate para comenzar en INTRA
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-[#0B2C4A]">
                            Nombre completo
                        </label>
                        <input
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B2C4A]"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            placeholder="Tu nombre completo"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-[#0B2C4A]">
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

                    <div>
                        <label className="text-sm font-medium text-[#0B2C4A]">
                            Contraseña
                        </label>
                        <input
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0B2C4A]"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="mínimo 6 caracteres"
                        />
                    </div>

                    {msg && (
                        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-600">
                            {msg}
                        </div>
                    )}

                    <button
                        disabled={loading}
                        className="w-full rounded-xl bg-[#0B2C4A] py-2 font-semibold text-white hover:scale-105 transition disabled:opacity-60"
                        type="submit"
                    >
                        {loading ? "Creando..." : "Crear cuenta"}
                    </button>

                    <p className="text-sm text-center text-gray-600">
                        ¿Ya tienes cuenta?{" "}
                        <a
                            className="font-semibold text-[#0B2C4A] hover:underline"
                            href="/login"
                        >
                            Inicia sesión
                        </a>
                    </p>
                </form>
            </div>
        </main>
    )
}