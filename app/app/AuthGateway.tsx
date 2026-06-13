"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  LogIn,
  PackageCheck,
  Plane,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getSignupEmailRedirectUrl,
  isUnconfirmedEmailMessage,
} from "@/lib/auth-flows";
import {
  PRIVACY_POLICY_DOCUMENT,
  TERMS_CONDITIONS_DOCUMENT,
} from "@/lib/legal/documents";
import { LegalDocumentModal } from "@/components/legal-document-modal";
import {
  PRIVACY_POLICY_KEY,
  PRIVACY_POLICY_VERSION,
  REGISTRATION_ACCEPTANCE_FLOW,
  TERMS_CONDITIONS_POLICY_KEY,
  TERMS_CONDITIONS_VERSION,
} from "@/lib/legal/policy-acceptance";
import { getSafeInternalPath, isSafeInternalPath } from "@/lib/safe-next";

type AuthTab = "login" | "register";
type RegistrationLegalModalKey = "terms-conditions" | "privacy-policy";

const registrationLegalDocuments = {
  "terms-conditions": TERMS_CONDITIONS_DOCUMENT,
  "privacy-policy": PRIVACY_POLICY_DOCUMENT,
} satisfies Record<
  RegistrationLegalModalKey,
  typeof TERMS_CONDITIONS_DOCUMENT | typeof PRIVACY_POLICY_DOCUMENT
>;

type AuthGatewayProps = {
  initialTab?: AuthTab;
  initialError?: string | null;
  nextPath?: string | null;
};

function getLoginErrorMessage(message: string) {
  if (isUnconfirmedEmailMessage(message)) {
    return "Verifica tu correo antes de entrar.";
  }

  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("credenciales")
  ) {
    return "No pudimos iniciar sesión. Revisa tu correo y contraseña.";
  }

  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "No pudimos iniciar sesión. Revisa tu conexión e intenta nuevamente.";
  }

  return "No pudimos iniciar sesión. Revisa tus datos e intenta nuevamente.";
}

function getRegisterErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "Ese correo ya está registrado. Intenta entrar o recupera tu contraseña.";
  }

  if (normalized.includes("password") || normalized.includes("contraseña")) {
    return "Usa una contraseña segura de al menos 6 caracteres.";
  }

  if (normalized.includes("invalid email") || normalized.includes("correo")) {
    return "Escribe un correo válido para crear tu cuenta.";
  }

  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "No pudimos crear tu cuenta. Revisa tu conexión e intenta nuevamente.";
  }

  return "No pudimos crear tu cuenta. Intenta nuevamente.";
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
  const [msg, setMsg] = useState<string | null>(
    initialError ? getLoginErrorMessage(initialError) : null
  );
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [legalModalKey, setLegalModalKey] = useState<RegistrationLegalModalKey | null>(null);

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
        setMsg("Verifica tu correo antes de entrar.");
        setNeedsEmailVerification(true);
        return;
      }

      setMsg(getLoginErrorMessage(error.message));
      return;
    }

    goAfterAuth(nextDestination);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setNeedsEmailVerification(false);

    if (!acceptedTerms || !acceptedPrivacy) {
      setLoading(false);
      setMsg("Acepta los términos y la política de privacidad para continuar.");
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
      setMsg(getRegisterErrorMessage(signUpError.message));
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
        setMsg("Tu cuenta fue creada, pero no pudimos guardar algunos datos. Intenta actualizar tu perfil.");
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
    <>
    <main className="intra-page-shell p-3 sm:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-5xl items-center justify-center sm:min-h-[calc(100vh-2rem)]">
        <div className="grid w-full overflow-hidden rounded-[var(--intra-radius-md)] border border-intra-border-soft bg-intra-card shadow-[var(--intra-shadow-base)] lg:grid-cols-[0.9fr_1fr]">
          <section className="intra-auth-hero px-5 py-6 sm:px-6 sm:py-7 lg:px-7 lg:py-8">
            <Link
              href="/"
              aria-label="Ir a la landing de INTRA"
              className="intra-auth-logo-shell p-3 ring-1 ring-white/70"
            >
              <Image
                src="/logo.png"
                alt="INTRA"
                width={280}
                height={180}
                className="h-auto w-[140px] sm:w-[170px]"
                priority
              />
            </Link>

            <div className="mt-5 max-w-lg">
              <h1 className="intra-h1 text-white">
                Bienvenido a INTRA
              </h1>
              <p className="intra-on-dark-body mt-2.5 max-w-md">
                Envía, viaja y conecta con confianza.
              </p>
            </div>

            <div className="mt-5 hidden gap-3 sm:grid sm:grid-cols-2">
              <div className="intra-auth-feature-card">
                <div className="intra-icon-shell-body rounded-[var(--intra-radius-xs)] bg-white/15 text-white">
                  <PackageCheck className="intra-icon-lg" aria-hidden="true" />
                </div>
                <h2 className="intra-on-dark-body-strong mt-3">Clientes</h2>
                <p className="intra-on-dark-body mt-2">
                  Publica envíos con seguimiento claro.
                </p>
              </div>
              <div className="intra-auth-feature-card">
                <div className="intra-icon-shell-body rounded-[var(--intra-radius-xs)] bg-white/15 text-white">
                  <Plane className="intra-icon-lg" aria-hidden="true" />
                </div>
                <h2 className="intra-on-dark-body-strong mt-3">Viajeros</h2>
                <p className="intra-on-dark-body mt-2">
                  Publica rutas y acepta oportunidades.
                </p>
              </div>
            </div>

            <div className="intra-auth-highlight mt-4 hidden items-start gap-3 sm:flex">
              <ShieldCheck className="intra-icon-lg mt-0.5 shrink-0" aria-hidden="true" />
              <span>Acceso protegido para operar envíos, viajes y pagos dentro de la app.</span>
            </div>

            {isSafeInternalPath(nextPath) ? (
              <div className="intra-auth-highlight mt-3 hidden items-start gap-3 sm:flex">
                <CheckCircle2 className="intra-icon-lg mt-0.5 shrink-0" aria-hidden="true" />
                <span>Después de entrar te llevaremos a <span className="intra-body-strong text-white">{nextPath}</span>.</span>
              </div>
            ) : null}

          </section>

          <section className="px-5 py-6 sm:px-6 sm:py-7 lg:px-7 lg:py-8">
            <div className="mx-auto w-full max-w-md">
              <div className="grid grid-cols-2 rounded-[var(--intra-radius-xs)] bg-intra-bg-app p-1">
                <button
                  type="button"
                  onClick={() => switchTab("login")}
                  className={`inline-flex min-h-11 items-center justify-center rounded-[10px] px-4 intra-body-strong transition ${
                    tab === "login"
                      ? "bg-intra-card text-intra-blue shadow-sm"
                      : "text-intra-text-subtle hover:text-intra-blue"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("register")}
                  className={`inline-flex min-h-11 items-center justify-center rounded-[10px] px-4 intra-body-strong transition ${
                    tab === "register"
                      ? "bg-intra-card text-intra-blue shadow-sm"
                      : "text-intra-text-subtle hover:text-intra-blue"
                  }`}
                >
                  Crear cuenta
                </button>
              </div>

              <div className="mt-5">
                <h2 className="intra-h1">
                  {tab === "login" ? "Entra a INTRA" : "Crea tu cuenta"}
                </h2>
                <p className="intra-body mt-2">
                  {tab === "login"
                    ? "Continúa con tus envíos, viajes y matches."
                    : "Empieza a publicar envíos o viajes."}
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
                      <label className="intra-label">Correo</label>
                      <input
                        className="intra-input mt-1"
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                        placeholder="correo@ejemplo.com"
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
                      <label className="intra-label">Correo</label>
                      <input
                        className="intra-input mt-1"
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        placeholder="correo@ejemplo.com"
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
                  <div className="space-y-2 rounded-[var(--intra-radius-xs)] border border-intra-border-soft bg-intra-bg-app px-3 py-3 intra-body text-intra-text-subtle">
                    <div className="flex items-start gap-3">
                      <input
                        id="terms-conditions-acceptance"
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-intra-border text-intra-text-success focus:ring-intra-text-success"
                        checked={acceptedTerms}
                        onChange={(event) => setAcceptedTerms(event.target.checked)}
                        required
                      />
                      <span>
                        Acepto los{" "}
                        <button
                          type="button"
                          onClick={() => setLegalModalKey("terms-conditions")}
                          className="intra-link text-intra-text-success underline underline-offset-4"
                        >
                          Términos y Condiciones
                        </button>
                        .
                      </span>
                    </div>
                    <div className="flex items-start gap-3">
                      <input
                        id="privacy-policy-acceptance"
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-intra-border text-intra-text-success focus:ring-intra-text-success"
                        checked={acceptedPrivacy}
                        onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                        required
                      />
                      <span>
                        Acepto la{" "}
                        <button
                          type="button"
                          onClick={() => setLegalModalKey("privacy-policy")}
                          className="intra-link text-intra-text-success underline underline-offset-4"
                        >
                          Política de Privacidad
                        </button>
                        .
                      </span>
                    </div>
                  </div>
                ) : null}

                {msg ? (
                  <div className="intra-alert-danger flex items-start gap-3">
                    <AlertCircle className="intra-icon-lg mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
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
                          Reenviar correo
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <button
                  disabled={loading}
                  className="intra-btn intra-btn-primary w-full"
                  type="submit"
                >
                  {tab === "login" ? (
                    <LogIn className="intra-icon-md" aria-hidden="true" />
                  ) : (
                    <UserPlus className="intra-icon-md" aria-hidden="true" />
                  )}
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
                  {tab === "login" ? "Crear cuenta" : "Entrar"}
                </button>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
    <LegalDocumentModal
      documentKey={legalModalKey}
      documents={registrationLegalDocuments}
      titleId="registration-legal-modal-title"
      onClose={() => setLegalModalKey(null)}
      onAcceptAndContinue={() => {
        if (legalModalKey === "terms-conditions") {
          setAcceptedTerms(true);
        } else {
          setAcceptedPrivacy(true);
        }

        setLegalModalKey(null);
      }}
    />
    </>
  );
}
