import { type EmailOtpType } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { getSafeInternalPath } from "@/lib/safe-next"

function createSupabaseRouteClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )
}

async function syncProfileFromMetadata(
  supabase: ReturnType<typeof createServerClient>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : ""

  const phone =
    typeof user.user_metadata?.phone === "string"
      ? user.user_metadata.phone.trim()
      : ""

  if (!fullName && !phone) return

  const profilePayload: {
    id: string
    full_name?: string
    phone?: string
  } = {
    id: user.id,
  }

  if (fullName) {
    profilePayload.full_name = fullName
  }

  if (phone) {
    profilePayload.phone = phone
  }

  await supabase.from("profiles").upsert(
    profilePayload,
    { onConflict: "id" }
  )
}

async function applyOnboardingRedirect(
  supabase: ReturnType<typeof createServerClient>,
  response: NextResponse,
  requestUrl: URL,
  isRecoveryFlow: boolean
) {
  if (isRecoveryFlow) return

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.onboarding_completed) {
    response.headers.set("Location", new URL("/app/onboarding", requestUrl.origin).toString())
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  const next = requestUrl.searchParams.get("next")

  const isRecoveryFlow = type === "recovery"
  const safeNext = getSafeInternalPath(
    next,
    isRecoveryFlow ? "/login/update-password" : "/app"
  )
  const successUrl = new URL(safeNext, requestUrl.origin)
  const errorUrl = new URL(
    isRecoveryFlow ? "/login/update-password" : "/login",
    requestUrl.origin
  )
  const response = NextResponse.redirect(successUrl)

  const supabase = createSupabaseRouteClient(request, response)

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      errorUrl.searchParams.set(
        "error",
        isRecoveryFlow
          ? "No pude validar el enlace para cambiar tu contraseña."
          : "No pude validar el enlace de confirmación."
      )
      return NextResponse.redirect(errorUrl)
    }

    await syncProfileFromMetadata(supabase)
    await applyOnboardingRedirect(supabase, response, requestUrl, isRecoveryFlow)
    return response
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    })

    if (error) {
      errorUrl.searchParams.set(
        "error",
        isRecoveryFlow
          ? "El enlace para cambiar tu contraseña es inválido o expiró."
          : "El enlace de confirmación es inválido o expiró."
      )
      return NextResponse.redirect(errorUrl)
    }

    await syncProfileFromMetadata(supabase)
    await applyOnboardingRedirect(supabase, response, requestUrl, isRecoveryFlow)
    return response
  }

  errorUrl.searchParams.set(
    "error",
    isRecoveryFlow
      ? "El enlace para cambiar tu contraseña no es válido."
      : "El enlace de confirmación no es válido."
  )
  return NextResponse.redirect(errorUrl)
}
