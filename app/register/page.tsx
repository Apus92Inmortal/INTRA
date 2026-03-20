"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

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

        // 2) Iniciar sesión (para tener auth.uid() y pasar RLS)
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

        // 3) Actualizar perfil con el nombre
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
        <main className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-xl border p-6">
                <h1 className="text-2xl font-bold">Crear cuenta</h1>
                <p className="mt-2 text-sm opacity-80">Regístrate para entrar a INTRA.</p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="text-sm">Nombre completo</label>
                        <input
                            className="mt-1 w-full rounded-md border px-3 py-2"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            placeholder="Tu nombre completo"
                        />
                    </div>

                    <div>
                        <label className="text-sm">Email</label>
                        <input
                            className="mt-1 w-full rounded-md border px-3 py-2"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="tu@email.com"
                        />
                    </div>

                    <div>
                        <label className="text-sm">Contraseña</label>
                        <input
                            className="mt-1 w-full rounded-md border px-3 py-2"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="mínimo 6 caracteres"
                        />
                    </div>

                    {msg && <div className="rounded-md border p-3 text-sm">{msg}</div>}

                    <button
                        disabled={loading}
                        className="w-full rounded-md bg-black text-white py-2 disabled:opacity-60"
                        type="submit"
                    >
                        {loading ? "Creando..." : "Crear cuenta"}
                    </button>

                    <p className="text-sm">
                        ¿Ya tienes cuenta?{" "}
                        <a className="underline" href="/login">
                            Inicia sesión
                        </a>
                    </p>
                </form>
            </div>
        </main>
    )
}
