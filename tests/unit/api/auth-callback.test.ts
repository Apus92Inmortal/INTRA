// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import type { CookieOptions } from "@supabase/ssr"

const { serverFactory, exchangeCode, verifyOtp, getUser, from, upsert, fetchMock } = vi.hoisted(() => ({
  serverFactory: vi.fn(),
  exchangeCode: vi.fn(),
  verifyOtp: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  fetchMock: vi.fn(),
}))
vi.mock("@supabase/ssr", () => ({ createServerClient: serverFactory }))
import { GET } from "@/app/auth/callback/route"

type Adapter = {
  cookies: {
    getAll: () => Array<{ name: string; value: string }>
    setAll: (cookies: Array<{ name: string; value: string; options: CookieOptions }>, headers?: Record<string, string>) => void
  }
}

const productionUrl = "https://okajyhkdyapbsornjeeb.supabase.co"
const callbackOrigin = "https://www.intra.com.co"
const flows = [
  { label: "PKCE", query: "code=synthetic-code", errorPath: "/login" },
  { label: "OTP", query: "token_hash=synthetic-hash&type=recovery", errorPath: "/login/update-password" },
]
let adapter: Adapter

function callbackRequest(query: string, cookie?: string) {
  return new NextRequest(`${callbackOrigin}/auth/callback?${query}`, {
    headers: cookie ? { cookie } : undefined,
  })
}

describe("auth callback deployment isolation and session continuity", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", productionUrl)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-public-key")
    vi.stubEnv("NEXT_PUBLIC_INTRA_DEPLOYMENT_ENV", "production")
    vi.stubEnv("VERCEL_ENV", "production")
    vi.stubGlobal("fetch", fetchMock)
    fetchMock.mockRejectedValue(new Error("No network allowed in callback unit tests"))
    exchangeCode.mockResolvedValue({ error: null })
    verifyOtp.mockResolvedValue({ error: null })
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    upsert.mockResolvedValue({ error: null })
    from.mockReturnValue({ upsert })
    serverFactory.mockImplementation((_url, _key, options: Adapter) => {
      adapter = options
      return { auth: { exchangeCodeForSession: exchangeCode, verifyOtp, getUser }, from }
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it.each(["preview", "development"].flatMap(environment => flows.map(flow => ({ environment, ...flow }))))(
    "blocks Production $label in hosted $environment before constructing a client or using the network",
    async ({ environment, query, errorPath }) => {
      vi.stubEnv("NEXT_PUBLIC_INTRA_DEPLOYMENT_ENV", environment)
      vi.stubEnv("VERCEL_ENV", environment)
      const response = await GET(callbackRequest(`${query}&next=https%3A%2F%2Funtrusted.example.test`))
      const location = new URL(response.headers.get("location")!)

      expect(response.status).toBe(307)
      expect(location.origin).toBe(callbackOrigin)
      expect(location.pathname).toBe(errorPath)
      expect(location.searchParams.get("error")).toBeTruthy()
      expect(location.searchParams.has("code")).toBe(false)
      expect(location.searchParams.has("token_hash")).toBe(false)
      expect(response.headers.get("cache-control")).toBe("private, no-store")
      expect(serverFactory).not.toHaveBeenCalled()
      expect(exchangeCode).not.toHaveBeenCalled()
      expect(verifyOtp).not.toHaveBeenCalled()
      expect(getUser).not.toHaveBeenCalled()
      expect(upsert).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
    }
  )

  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"].flatMap(missing => flows.map(flow => ({ missing, ...flow }))))(
    "handles missing $missing for $label without constructing a client or using the network",
    async ({ missing, query, errorPath }) => {
      vi.stubEnv(missing, undefined)
      const response = await GET(callbackRequest(query))
      const location = new URL(response.headers.get("location")!)

      expect(location.origin).toBe(callbackOrigin)
      expect(location.pathname).toBe(errorPath)
      expect(location.searchParams.get("error")).toBeTruthy()
      expect(serverFactory).not.toHaveBeenCalled()
      expect(fetchMock).not.toHaveBeenCalled()
    }
  )

  it("exchanges Production PKCE, carries all cookies and synchronizes verified user metadata", async () => {
    let cookiesAfterExchange: ReturnType<Adapter["cookies"]["getAll"]> = []
    exchangeCode.mockImplementation(async () => {
      expect(adapter.cookies.getAll()).toContainEqual({ name: "sb-test-code-verifier", value: "synthetic-verifier" })
      adapter.cookies.setAll([
        { name: "sb-test-code-verifier", value: "", options: { path: "/", maxAge: 0 } },
        { name: "sb-test-session.0", value: "first", options: { path: "/", secure: true, httpOnly: true, sameSite: "lax" } },
      ])
      return { error: null }
    })
    getUser.mockImplementation(async () => {
      cookiesAfterExchange = adapter.cookies.getAll()
      adapter.cookies.setAll([{ name: "sb-test-session.1", value: "second", options: { path: "/", secure: true } }])
      return { data: { user: { id: "synthetic-user", user_metadata: { full_name: " Test User ", phone: " 3000000000 " } } }, error: null }
    })
    const response = await GET(callbackRequest("code=synthetic-code&next=%2Fapp%2Fprofile", "sb-test-code-verifier=synthetic-verifier"))

    expect(serverFactory).toHaveBeenCalledWith(productionUrl, "synthetic-public-key", expect.any(Object))
    expect(exchangeCode).toHaveBeenCalledWith("synthetic-code")
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(cookiesAfterExchange).toContainEqual({ name: "sb-test-session.0", value: "first" })
    expect(cookiesAfterExchange).toContainEqual({ name: "sb-test-code-verifier", value: "" })
    expect(response.headers.get("location")).toBe(`${callbackOrigin}/app/profile`)
    expect(response.cookies.get("sb-test-code-verifier")).toMatchObject({ value: "", maxAge: 0, path: "/" })
    expect(response.cookies.get("sb-test-session.0")).toMatchObject({ value: "first", secure: true, httpOnly: true, sameSite: "lax", path: "/" })
    expect(response.cookies.get("sb-test-session.1")?.value).toBe("second")
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("pragma")).toBe("no-cache")
    expect(response.headers.get("expires")).toBe("0")
    expect(from).toHaveBeenCalledWith("profiles")
    expect(upsert).toHaveBeenCalledWith({ id: "synthetic-user", full_name: "Test User", phone: "3000000000" }, { onConflict: "id" })
  })

  it("verifies Production OTP and preserves the existing recovery destination and session cookie", async () => {
    verifyOtp.mockImplementation(async () => {
      adapter.cookies.setAll([{ name: "sb-test-session", value: "otp-session", options: { path: "/", secure: true } }])
      return { error: null }
    })
    const response = await GET(callbackRequest("token_hash=synthetic-hash&type=recovery"))

    expect(verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "synthetic-hash" })
    expect(exchangeCode).not.toHaveBeenCalled()
    expect(getUser).toHaveBeenCalledOnce()
    expect(response.headers.get("location")).toBe(`${callbackOrigin}/login/update-password`)
    expect(response.cookies.get("sb-test-session")?.value).toBe("otp-session")
    expect(upsert).not.toHaveBeenCalled()
  })

  it.each(flows)("retains SDK cookie cleanup and cache headers on a failed $label exchange", async ({ label, query, errorPath }) => {
    const fail = async () => {
      adapter.cookies.setAll(
        [{ name: "sb-test-session", value: "", options: { path: "/", maxAge: 0 } }],
        { "Cache-Control": "private, no-cache, no-store, must-revalidate", Expires: "Thu, 01 Jan 1970 00:00:00 GMT" }
      )
      return { error: { message: "Synthetic invalid exchange" } }
    }
    if (label === "PKCE") exchangeCode.mockImplementation(fail)
    else verifyOtp.mockImplementation(fail)
    const response = await GET(callbackRequest(query))
    const location = new URL(response.headers.get("location")!)

    expect(location.origin).toBe(callbackOrigin)
    expect(location.pathname).toBe(errorPath)
    expect(location.searchParams.get("error")).toBeTruthy()
    expect(response.cookies.get("sb-test-session")).toMatchObject({ value: "", maxAge: 0, path: "/" })
    expect(response.headers.get("cache-control")).toBe("private, no-cache, no-store, must-revalidate")
    expect(response.headers.get("expires")).toBe("Thu, 01 Jan 1970 00:00:00 GMT")
    expect(getUser).not.toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
  })

  it("allows an isolated Preview database without accepting an external next destination", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://isolated-test.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_INTRA_DEPLOYMENT_ENV", "preview")
    vi.stubEnv("VERCEL_ENV", "preview")
    const response = await GET(callbackRequest("code=synthetic-code&next=https%3A%2F%2Funtrusted.example.test"))

    expect(serverFactory).toHaveBeenCalledWith("https://isolated-test.supabase.co", "synthetic-public-key", expect.any(Object))
    expect(exchangeCode).toHaveBeenCalledWith("synthetic-code")
    expect(response.headers.get("location")).toBe(`${callbackOrigin}/app`)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
