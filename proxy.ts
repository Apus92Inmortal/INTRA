import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { isSafeInternalPath } from "@/lib/safe-next"

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

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (pathname.startsWith("/app/") && !user) {
    return redirectToAppAuth(request, "login", pathname)
  }

  if ((pathname === "/login" || pathname === "/register") && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/app"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/app", "/app/:path*", "/login", "/register", "/shipments/new", "/trips/new"],
}
