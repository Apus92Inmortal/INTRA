// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import type { CookieOptions } from "@supabase/ssr"

const { serverFactory } = vi.hoisted(() => ({ serverFactory: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: serverFactory }))
import { proxy } from "@/proxy"

type Adapter = {
  cookies: {
    getAll: () => Array<{ name: string; value: string }>
    setAll: (cookies: Array<{ name: string; value: string; options: CookieOptions }>, headers?: Record<string, string>) => void
  }
}

describe("proxy session refresh", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://isolated-test.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-public-key")
    vi.stubEnv("NEXT_PUBLIC_INTRA_DEPLOYMENT_ENV", "preview")
  })
  afterEach(() => vi.unstubAllEnvs())

  it("passes refreshed cookies to the current SSR request and browser, without caching the session", async () => {
    let readAfterRefresh: ReturnType<Adapter["cookies"]["getAll"]> = []
    serverFactory.mockImplementation((_url, _key, adapter: Adapter) => ({
      auth: { getUser: async () => {
        adapter.cookies.setAll([{ name: "sb-test-session", value: "refreshed", options: { path: "/", httpOnly: true, sameSite: "lax" } }])
        readAfterRefresh = adapter.cookies.getAll()
        return { data: { user: { id: "synthetic-user" } }, error: null }
      } },
    }))
    const request = new NextRequest("http://localhost:3000/app/wallet", { headers: { cookie: "sb-test-session=expired" } })
    const response = await proxy(request)
    expect(readAfterRefresh).toContainEqual({ name: "sb-test-session", value: "refreshed" })
    expect(request.cookies.get("sb-test-session")?.value).toBe("refreshed")
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-test-session=refreshed")
    expect(response.cookies.get("sb-test-session")).toMatchObject({ value: "refreshed", path: "/", httpOnly: true, sameSite: "lax" })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("pragma")).toBe("no-cache")
    expect(response.headers.get("expires")).toBe("0")
  })

  it("keeps cookie removal and adapter cache headers when an invalid session redirects to login", async () => {
    serverFactory.mockImplementation((_url, _key, adapter: Adapter) => ({
      auth: { getUser: async () => {
        adapter.cookies.setAll([{ name: "sb-test-session", value: "", options: { path: "/", maxAge: 0 } }], {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
          "Pragma": "no-cache", "Expires": "Thu, 01 Jan 1970 00:00:00 GMT",
        })
        return { data: { user: null }, error: null }
      } },
    }))
    const response = await proxy(new NextRequest("http://localhost:3000/app/wallet", { headers: { cookie: "sb-test-session=invalid" } }))
    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("http://localhost:3000/app?tab=login&next=%2Fapp%2Fwallet")
    expect(response.cookies.get("sb-test-session")).toMatchObject({ value: "", maxAge: 0, path: "/" })
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, must-revalidate")
    expect(response.headers.get("expires")).toBe("Thu, 01 Jan 1970 00:00:00 GMT")
    expect(response.headers.get("x-middleware-next")).toBeNull()
  })

  it("retains cookie updates from multiple adapter writes", async () => {
    serverFactory.mockImplementation((_url, _key, adapter: Adapter) => ({
      auth: { getUser: async () => {
        adapter.cookies.setAll([{ name: "sb-test-session.0", value: "first", options: { path: "/" } }])
        adapter.cookies.setAll([{ name: "sb-test-session.1", value: "second", options: { path: "/" } }])
        return { data: { user: { id: "synthetic-user" } }, error: null }
      } },
    }))
    const response = await proxy(new NextRequest("http://localhost:3000/app/wallet"))
    expect(response.cookies.get("sb-test-session.0")?.value).toBe("first")
    expect(response.cookies.get("sb-test-session.1")?.value).toBe("second")
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-test-session.0=first")
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-test-session.1=second")
  })
})
