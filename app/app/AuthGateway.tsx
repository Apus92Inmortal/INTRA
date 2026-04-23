"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthTab = "login" | "register";

type AuthGatewayProps = {
  initialTab?: AuthTab;
  initialError?: string | null;
  nextPath?: string | null;
};

function isUnconfirmedEmailMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("email not confirmed") ||
    normalized.includes("email_not_confirmed") ||
    (normalized.includes("correo") && normalized.includes("confirm"))
  );
}

function getAuthCallbackUrl(nextPath?: string | null) {
  const url = new URL("/auth/callback", window.location.origin);

  if (nextPath?.startsWith("/")) {
    url.searchParams.set("next", nextPath);
  }

  return url.toString();
}

export default function AuthGateway({
  initialTab = "login",
  initialError = null,
  nextPath = null,
}: AuthGatewayProps) {
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(initialError);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const nextDestination = useMemo(() => {
    if (nextPath?.startsWith("/")) return nextPath;
    return "/app";
  }, [nextPath]);

  const syncQuery = (nextTab: AuthTab) => {
    const params = new URLSearchParams();
    params.set("tab", nextTab);
    if (nextPath?.startsWith("/")) {
      params.set("next", nextPath);
    }
    router.replace(`/app?${params.toString()}`);
  };

  const switchTab = (nextTab: AuthTab) => {
    setTab(nextTab);
    setMsg(null);
    setNeedsEmailVerification(false);
    syncQuery(nextTab);
  };

  const goAfterAuth = (path?: string | null) => {
    window.location.assign(path?.startsWith("/") ? path : "/app");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setNeedsEmailVerification(false);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    setLoading(false);

    if (error) {
      if (isUnconfirmedEmailMessage(error.message)) {
        setMsg("❌ Debes verificar tu correo antes de ingresar.");
        setNeedsEmailVerification(true);
        return;
      }

      setMsg("❌ " + error.message);
      return;
    }

    goAfterAuth(nextDestination);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setNeedsEmailVerification(false);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: {
        emailRedirectTo: getAuthCallbackUrl(nextDestination),
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      setMsg("❌ " + signUpError.message);
      return;
    }

    const userId = signUpData.user?.id;
    const hasSession = Boolean(signUpData.session);

    if (hasSession && userId) {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: fullName.trim(),
        },
        { onConflict: "id" }
      );

      if (profileError) {
        setLoading(false);
        setMsg("❌ No pude guardar el nombre: " + profileError.message);
        return;
      }

      setLoading(false);
      goAfterAuth(nextDestination);
      return;
    }

    setLoading(false);

    const params = new URLSearchParams({
      email: registerEmail,
    });

    if (nextDestination.startsWith("/")) {
      params.set("next", nextDestination);
    }

    router.push(`/verify-email?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-400 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] bg-white shadow-[0_24px_70px_rgba(11,44,74,0.16)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="bg-[linear-gradient(160deg,#0B2C4A_0%,#123d61_55%,#0f6b52_100%)] px-8 py-10 text-white sm:px-10 lg:px-12 lg:py-14">
            <Link
              href="/"
              aria-label="Ir a la landing de INTRA"
              className="inline-flex rounded-3xl bg-white/96 p-4 shadow-[0_18px_50px_rgba(8,26,44,0.22)] ring-1 ring-white/70 transition hover:scale-[1.01] sm:p-5"
            >
              <Image
                src="/logo.png"
                alt="INTRA"
                width={280}
                height={180}
                className="h-auto w-[180px] sm:w-[220px]"
                priority
              />
            </Link>

            <div className="mt-8 max-w-xl">
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Entra a INTRA desde aquí
              </h1>
              <p className="mt-4 text-base leading-7 text-white/82 sm:text-lg">
                Esta es la entrada oficial de la app. Desde aquí puedes iniciar sesión o crear tu cuenta para publicar envíos y viajes.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <div className="text-2xl">📦</div>
                <h2 className="mt-3 text-lg font-bold">Clientes</h2>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  Publica tu envío y encuentra viajeros reales para tu ruta.
                </p>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <div className="text-2xl">✈️</div>
                <h2 className="mt-3 text-lg font-bold">Viajeros</h2>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  Monetiza tu viaje llevando paquetes que ya van en tu misma dirección.
                </p>
              </div>
            </div>

            {nextPath?.startsWith("/") ? (
              <div className="mt-8 rounded-2xl border border-[#2ECC71]/35 bg-[#2ECC71]/14 p-4 text-sm text-white/92">
                Después de autenticarte te llevaremos a <span className="font-bold">{nextPath}</span>.
              </div>
            ) : null}

          </section>

          <section className="px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
            <div className="mx-auto w-full max-w-md">
              <div className="grid grid-cols-2 rounded-2xl bg-[#EEF2F7] p-1.5">
                <button
                  type="button"
                  onClick={() => switchTab("login")}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    tab === "login"
                      ? "bg-white text-[#0B2C4A] shadow-sm"
                      : "text-slate-500 hover:text-[#0B2C4A]"
                  }`}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("register")}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    tab === "register"
                      ? "bg-white text-[#0B2C4A] shadow-sm"
                      : "text-slate-500 hover:text-[#0B2C4A]"
                  }`}
                >
                  Registrarse
                </button>
              </div>

              <div className="mt-8">
                <h2 className="text-3xl font-bold text-[#0B2C4A]">
                  {tab === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {tab === "login"
                    ? "Ingresa para continuar dentro de INTRA."
                    : "Regístrate para empezar a publicar envíos o viajes."}
                </p>
              </div>

              <form
                onSubmit={tab === "login" ? handleLogin : handleRegister}
                className="mt-8 space-y-4"
              >
                {tab === "register" ? (
                  <div>
                    <label className="text-sm font-medium text-[#0B2C4A]">
                      Nombre completo
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0B2C4A]"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Tu nombre completo"
                    />
                  </div>
                ) : null}

                <div>
                  <label className="text-sm font-medium text-[#0B2C4A]">Email</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0B2C4A]"
                    type="email"
                    value={tab === "login" ? loginEmail : registerEmail}
                    onChange={(e) =>
                      tab === "login"
                        ? setLoginEmail(e.target.value)
                        : setRegisterEmail(e.target.value)
                    }
                    required
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[#0B2C4A]">
                    Contraseña
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0B2C4A]"
                    type="password"
                    value={tab === "login" ? loginPassword : registerPassword}
                    onChange={(e) =>
                      tab === "login"
                        ? setLoginPassword(e.target.value)
                        : setRegisterPassword(e.target.value)
                    }
                    required
                    minLength={tab === "register" ? 6 : undefined}
                    placeholder={tab === "login" ? "tu contraseña" : "mínimo 6 caracteres"}
                  />
                </div>

                {msg ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <p>{msg}</p>

                    {needsEmailVerification && loginEmail ? (
                      <Link
                        className="mt-2 inline-block font-semibold text-[#0B2C4A] hover:underline"
                        href={`/verify-email?email=${encodeURIComponent(loginEmail)}${
                          nextDestination.startsWith("/")
                            ? `&next=${encodeURIComponent(nextDestination)}`
                            : ""
                        }`}
                      >
                        Reenviar correo de verificación
                      </Link>
                    ) : null}
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#0B2C4A] py-3 font-semibold text-white transition hover:scale-[1.01] disabled:opacity-60"
                  type="submit"
                >
                  {loading
                    ? tab === "login"
                      ? "Entrando..."
                      : "Creando..."
                    : tab === "login"
                      ? "Entrar"
                      : "Crear cuenta"}
                </button>
              </form>

              <p className="mt-5 text-sm text-slate-600">
                {tab === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
                <button
                  type="button"
                  onClick={() => switchTab(tab === "login" ? "register" : "login")}
                  className="font-semibold text-[#0B2C4A] hover:underline"
                >
                  {tab === "login" ? "Regístrate" : "Inicia sesión"}
                </button>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
