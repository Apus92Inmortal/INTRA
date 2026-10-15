import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { isSafeInternalPath } from "@/lib/safe-next"
import { hasSafeSupabaseEnv } from "@/lib/supabase/environment"

function redirectToAppAuth(request: NextRequest, tab: "login" | "register", next?: string) {
  const url = request.nextUrl.clone()
  url.pathname = "/app"
  url.search = ""
  url.searchParams.set("tab", tab)

  if (isSafeInternalPath(next)) {
    url.searchParams.set("next", next)
  }

  const error = request.nextUrl.searchParams.get("error")
  if (error && tab === "login") {
    url.searchParams.set("error", error)
  }

  return NextResponse.redirect(url)
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (pathname === "/shipments/new") {
    const url = request.nextUrl.clone()
    url.pathname = "/app/shipments/new"
    return NextResponse.redirect(url)
  }

  if (pathname === "/trips/new") {
    const url = request.nextUrl.clone()
    url.pathname = "/app/trips/new"
    return NextResponse.redirect(url)
  }

  if (pathname === "/login") {
    return redirectToAppAuth(request, "login", request.nextUrl.searchParams.get("next") ?? undefined)
  }

  if (pathname === "/register") {
    return redirectToAppAuth(request, "register", request.nextUrl.searchParams.get("next") ?? undefined)
  }

  let response = NextResponse.next({ request })
  const sessionHeaders = new Headers()

  function carrySessionResponse(target: NextResponse) {
    response.cookies.getAll().forEach(cookie => target.cookies.set(cookie))
    sessionHeaders.forEach((value, name) => target.headers.set(name, value))
    return target
  }

  if (!hasSafeSupabaseEnv()) {
    return pathname.startsWith("/app/") ? redirectToAppAuth(request, "login", pathname) : response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headersToSet?: Record<string, string>) {
          const previousCookies = response.cookies.getAll()
          // Server Components must receive the refreshed cookies in this request.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          previousCookies.forEach(cookie => response.cookies.set(cookie))
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })

          // SSR 0.8 supplies cookies only; also support adapters that supply headers.
          Object.entries(headersToSet ?? {}).forEach(([name, value]) => sessionHeaders.set(name, value))
          if (!sessionHeaders.has("cache-control")) sessionHeaders.set("Cache-Control", "private, no-store")
          if (!sessionHeaders.has("pragma")) sessionHeaders.set("Pragma", "no-cache")
          if (!sessionHeaders.has("expires")) sessionHeaders.set("Expires", "0")
          sessionHeaders.forEach((value, name) => response.headers.set(name, value))
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (pathname.startsWith("/app/") && !user) {
    return carrySessionResponse(redirectToAppAuth(request, "login", pathname))
  }

  if ((pathname === "/login" || pathname === "/register") && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/app"
    url.search = ""
    return carrySessionResponse(NextResponse.redirect(url))
  }

  return response
}

export const config = {
  matcher: ["/app", "/app/:path*", "/login", "/register", "/shipments/new", "/trips/new"],
}
