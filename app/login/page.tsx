"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

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
        <main className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-xl border p-6">
                <h1 className="text-2xl font-bold">Iniciar sesión</h1>
                <p className="mt-2 text-sm opacity-80">
                    Entra a tu cuenta de INTRA.
                </p>

                <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                            placeholder="tu contraseña"
                        />
                    </div>

                    {msg && (
                        <div className="rounded-md border p-3 text-sm">
                            {msg}
                        </div>
                    )}

                    <button
                        disabled={loading}
                        className="w-full rounded-md bg-black text-white py-2 disabled:opacity-60"
                        type="submit"
                    >
                        {loading ? "Entrando..." : "Entrar"}
                    </button>

                    <p className="text-sm">
                        ¿No tienes cuenta?{" "}
                        <a className="underline" href="/register">
                            Regístrate
                        </a>
                    </p>
                </form>
            </div>
        </main>
    )
}
