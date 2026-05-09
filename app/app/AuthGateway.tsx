"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getSignupEmailRedirectUrl,
  isUnconfirmedEmailMessage,
} from "@/lib/auth-flows";
import { getSafeInternalPath, isSafeInternalPath } from "@/lib/safe-next";

type AuthTab = "login" | "register";

type AuthGatewayProps = {
  initialTab?: AuthTab;
  initialError?: string | null;
  nextPath?: string | null;
};

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
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const nextDestination = useMemo(() => getSafeInternalPath(nextPath), [nextPath]);

  const syncQuery = (nextTab: AuthTab) => {
    const params = new URLSearchParams();
    params.set("tab", nextTab);
    if (isSafeInternalPath(nextPath)) {
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
    window.location.assign(getSafeInternalPath(path));
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
        emailRedirectTo: getSignupEmailRedirectUrl(nextDestination),
        data: {
          full_name: fullName.trim(),
          phone: registerPhone.trim(),
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
          phone: registerPhone.trim(),
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

    if (isSafeInternalPath(nextDestination)) {
      params.set("next", nextDestination);
    }

    router.push(`/verify-email?${params.toString()}`);
  };

  return (
    <main className="intra-page-shell p-3 sm:p-4 lg:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-6xl items-center justify-center sm:min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-2.5rem)]">
        <div className="grid w-full overflow-hidden rounded-[32px] bg-white shadow-[0_24px_70px_rgba(11,44,74,0.16)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="intra-auth-hero px-6 py-7 sm:px-7 sm:py-8 lg:px-8 lg:py-8">
            <Link
              href="/"
              aria-label="Ir a la landing de INTRA"
              className="intra-auth-logo-shell ring-1 ring-white/70 sm:p-4"
            >
              <Image
                src="/logo.png"
                alt="INTRA"
                width={280}
                height={180}
                className="h-auto w-[160px] sm:w-[190px]"
                priority
              />
            </Link>

            <div className="mt-5 max-w-xl">
              <h1 className="intra-landing-hero-title">
                Entra a INTRA desde aquí
              </h1>
              <p className="intra-landing-lead mt-2.5 text-white/82">
                Esta es la entrada oficial de la app. Desde aquí puedes iniciar sesión o crear tu cuenta para publicar envíos y viajes.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="intra-auth-feature-card">
                <div className="text-2xl">📦</div>
                <h2 className="intra-on-dark-body-strong mt-3">Clientes</h2>
                <p className="intra-on-dark-body mt-2">
                  Publica tu envío y encuentra viajeros reales para tu ruta.
                </p>
              </div>
              <div className="intra-auth-feature-card">
                <div className="text-2xl">✈️</div>
                <h2 className="intra-on-dark-body-strong mt-3">Viajeros</h2>
                <p className="intra-on-dark-body mt-2">
                  Monetiza tu viaje llevando paquetes que ya van en tu misma dirección.
                </p>
              </div>
            </div>

            {isSafeInternalPath(nextPath) ? (
              <div className="intra-auth-highlight mt-5">
                Después de autenticarte te llevaremos a <span className="font-bold">{nextPath}</span>.
              </div>
            ) : null}

          </section>

          <section className="px-5 py-6 sm:px-6 sm:py-7 lg:px-7 lg:py-8">
            <div className="mx-auto w-full max-w-md">
              <div className="grid grid-cols-2 rounded-2xl bg-[#EEF2F7] p-1.5">
                <button
                  type="button"
                  onClick={() => switchTab("login")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
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
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    tab === "register"
                      ? "bg-white text-[#0B2C4A] shadow-sm"
                      : "text-slate-500 hover:text-[#0B2C4A]"
                  }`}
                >
                  Registrarse
                </button>
              </div>

              <div className="mt-5">
                <h2 className="intra-h1">
                  {tab === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
                </h2>
                <p className="intra-body mt-2">
                  {tab === "login"
                    ? "Ingresa para continuar dentro de INTRA."
                    : "Regístrate para empezar a publicar envíos o viajes."}
                </p>
              </div>

              <form
                onSubmit={tab === "login" ? handleLogin : handleRegister}
                className={`mt-5 ${tab === "register" ? "space-y-3" : "space-y-3.5"}`}
              >
                {tab === "register" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="intra-label">
                        Nombre completo
                      </label>
                      <input
                        className="intra-input mt-1"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="Tu nombre completo"
                      />
                    </div>
                    <div>
                      <label className="intra-label">
                        Teléfono
                      </label>
                      <input
                        className="intra-input mt-1"
                        type="tel"
                        inputMode="tel"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        required
                        placeholder="3001234567"
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className="intra-label">Email</label>
                  <input
                    className="intra-input mt-1"
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
                  <div className="flex items-center justify-between gap-3">
                    <label className="intra-label">
                      Contraseña
                    </label>
                    {tab === "login" ? (
                      <Link
                        href="/login/reset-password"
                        className="intra-link"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    ) : null}
                  </div>
                  <input
                    className="intra-input mt-1"
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
                  <div className="intra-alert-danger">
                    <p>{msg}</p>

                    {needsEmailVerification && loginEmail ? (
                      <Link
                        className="intra-link mt-2 inline-block"
                        href={`/verify-email?email=${encodeURIComponent(loginEmail)}${
                          isSafeInternalPath(nextDestination)
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
                  className="intra-btn intra-btn-primary w-full"
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

              <p className="intra-body mt-5">
                {tab === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
                <button
                  type="button"
                  onClick={() => switchTab(tab === "login" ? "register" : "login")}
                  className="intra-link"
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
