import { type EmailOtpType } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

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

  if (!fullName) return

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
    },
    { onConflict: "id" }
  )
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  const next = requestUrl.searchParams.get("next")

  const safeNext = next?.startsWith("/") ? next : "/app"
  const successUrl = new URL(safeNext, requestUrl.origin)
  const errorUrl = new URL("/login", requestUrl.origin)
  const response = NextResponse.redirect(successUrl)

  const supabase = createSupabaseRouteClient(request, response)

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      errorUrl.searchParams.set("error", "No pude validar el enlace de confirmación.")
      return NextResponse.redirect(errorUrl)
    }

    await syncProfileFromMetadata(supabase)
    return response
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    })

    if (error) {
      errorUrl.searchParams.set("error", "El enlace de confirmación es inválido o expiró.")
      return NextResponse.redirect(errorUrl)
    }

    await syncProfileFromMetadata(supabase)
    return response
  }

  errorUrl.searchParams.set("error", "El enlace de confirmación no es válido.")
  return NextResponse.redirect(errorUrl)
}
