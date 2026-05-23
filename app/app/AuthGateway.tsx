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
import {
  PRIVACY_POLICY_KEY,
  PRIVACY_POLICY_VERSION,
  REGISTRATION_ACCEPTANCE_FLOW,
  TERMS_CONDITIONS_POLICY_KEY,
  TERMS_CONDITIONS_VERSION,
} from "@/lib/legal/policy-acceptance";
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
  const [acceptedBasePolicies, setAcceptedBasePolicies] = useState(false);

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

    if (!acceptedBasePolicies) {
      setLoading(false);
      setMsg("❌ Debes aceptar los Términos y la Política de Privacidad para crear tu cuenta.");
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: {
        emailRedirectTo: getSignupEmailRedirectUrl(nextDestination),
        data: {
          full_name: fullName.trim(),
          phone: registerPhone.trim(),
          policy_acceptances: {
            [TERMS_CONDITIONS_POLICY_KEY]: {
              accepted: true,
              version: TERMS_CONDITIONS_VERSION,
              flow: REGISTRATION_ACCEPTANCE_FLOW,
            },
            [PRIVACY_POLICY_KEY]: {
              accepted: true,
              version: PRIVACY_POLICY_VERSION,
              flow: REGISTRATION_ACCEPTANCE_FLOW,
            },
          },
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
    <main className="intra-page-shell p-2 sm:p-3 lg:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] w-full max-w-6xl items-center justify-center sm:min-h-[calc(100vh-1.5rem)] lg:h-[calc(100vh-2rem)] lg:min-h-0">
        <div className="grid w-full overflow-hidden rounded-[32px] bg-intra-card shadow-[var(--intra-shadow-hero)] lg:h-full lg:grid-cols-[1.05fr_0.95fr]">
          <section className="intra-auth-hero px-6 py-7 sm:px-7 sm:py-8 lg:min-h-0 lg:overflow-y-auto lg:px-8 lg:py-8">
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

          <section className="px-5 py-6 sm:px-6 sm:py-7 lg:min-h-0 lg:overflow-y-auto lg:px-7 lg:py-8">
            <div className="mx-auto w-full max-w-md lg:min-h-full">
              <div className="grid grid-cols-2 rounded-2xl bg-intra-bg-app p-1.5">
                <button
                  type="button"
                  onClick={() => switchTab("login")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    tab === "login"
                      ? "bg-intra-card text-intra-blue shadow-sm"
                      : "text-intra-text-subtle hover:text-intra-blue"
                  }`}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("register")}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    tab === "register"
                      ? "bg-intra-card text-intra-blue shadow-sm"
                      : "text-intra-text-subtle hover:text-intra-blue"
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
                  <div className="grid gap-3 lg:grid-cols-2">
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

                {tab === "register" ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <label className="intra-label">Email</label>
                      <input
                        className="intra-input mt-1"
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                        placeholder="tu@email.com"
                      />
                    </div>

                    <div>
                      <label className="intra-label">
                        Contraseña
                      </label>
                      <input
                        className="intra-input mt-1"
                        type="password"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="mínimo 6 caracteres"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="intra-label">Email</label>
                      <input
                        className="intra-input mt-1"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        placeholder="tu@email.com"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="intra-label">
                          Contraseña
                        </label>
                        <Link
                          href="/login/reset-password"
                          className="intra-link"
                        >
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>
                      <input
                        className="intra-input mt-1"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        placeholder="tu contraseña"
                      />
                    </div>
                  </>
                )}

                {tab === "register" ? (
                  <label className="flex items-start gap-3 rounded-2xl border border-intra-border-soft bg-intra-bg-app px-3 py-3 text-sm leading-5 text-intra-text-subtle">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-intra-border text-intra-text-success focus:ring-intra-text-success"
                      checked={acceptedBasePolicies}
                      onChange={(event) => setAcceptedBasePolicies(event.target.checked)}
                      required
                    />
                    <span>
                      Acepto los{" "}
                      <span className="font-semibold text-intra-text-success underline underline-offset-4">
                        Términos y Condiciones
                      </span>{" "}
                      y la{" "}
                      <span className="font-semibold text-intra-text-success underline underline-offset-4">
                        Política de Privacidad
                      </span>
                      .
                    </span>
                  </label>
                ) : null}

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
