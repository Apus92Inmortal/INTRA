// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { getUser, getClaims } = vi.hoisted(() => ({ getUser: vi.fn(), getClaims: vi.fn() }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser, getClaims } }) }))
import { AdminMfaRequiredError, isConfiguredAdmin, requireAdminUser, requireConfiguredAdminUser } from "@/lib/auth/admin"

describe("admin identity authorization", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv("ADMIN_USER_IDS", "existing-admin-id")
    getUser.mockResolvedValue({ data: { user: { id: "existing-admin-id" } }, error: null })
    getClaims.mockResolvedValue({ data: { claims: { sub: "existing-admin-id", aal: "aal1" } }, error: null })
  })
  afterEach(() => vi.unstubAllEnvs())

  it("does not grant admin to a new account claiming an allowlisted email", () => {
    vi.stubEnv("ADMIN_USER_IDS", "existing-admin-id")
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com")
    expect(isConfiguredAdmin({ id: "attacker-id", email: "admin@example.com" })).toBe(false)
    expect(isConfiguredAdmin({ id: "existing-admin-id", email: "changed@example.com" })).toBe(true)
  })

  it("fails closed when only the legacy email configuration exists", async () => {
    vi.stubEnv("ADMIN_USER_IDS", "")
    vi.stubEnv("ADMIN_EMAILS", "admin@example.com")
    getUser.mockResolvedValue({ data: { user: { id: "attacker-id", email: "admin@example.com" } }, error: null })
    await expect(requireAdminUser()).rejects.toThrow("Define ADMIN_USER_IDS")
    expect(getClaims).not.toHaveBeenCalled()
  })

  it("allows the configured identity to enroll without granting admin operations", async () => {
    await expect(requireConfiguredAdminUser()).resolves.toMatchObject({ user: { id: "existing-admin-id" } })
    expect(getClaims).not.toHaveBeenCalled()
    await expect(requireAdminUser()).rejects.toBeInstanceOf(AdminMfaRequiredError)
  })

  it.each(["aal1", undefined, null, "aal3"])("denies a valid session without exact aal2 (%s)", async aal => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "existing-admin-id", aal } }, error: null })
    await expect(requireAdminUser()).rejects.toBeInstanceOf(AdminMfaRequiredError)
  })

  it.each([
    { data: null, error: { message: "Invalid JWT signature" } },
    { data: { claims: { sub: "existing-admin-id", aal: "aal2" } }, error: { message: "Expired JWT" } },
    { data: { claims: null }, error: null },
    { data: { claims: { sub: "different-user-id", aal: "aal2" } }, error: null },
    { data: { claims: { aal: "aal2" } }, error: null },
  ])("rejects invalid/missing claims or another identity even when aal2 is claimed", async result => {
    getClaims.mockResolvedValue(result)
    await expect(requireAdminUser()).rejects.toThrow("No pudimos verificar tu sesión")
  })

  it("does not accept MFA flags in user metadata as verification", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "existing-admin-id", user_metadata: { aal: "aal2", mfa_verified: true } } }, error: null,
    })
    await expect(requireAdminUser()).rejects.toBeInstanceOf(AdminMfaRequiredError)
  })

  it("rejects an authenticated ordinary user before consulting privileged claims", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "ordinary-user" } }, error: null })
    getClaims.mockResolvedValue({ data: { claims: { sub: "ordinary-user", aal: "aal2" } }, error: null })
    await expect(requireConfiguredAdminUser()).rejects.toThrow("No autorizado")
    await expect(requireAdminUser()).rejects.toThrow("No autorizado")
    expect(getClaims).not.toHaveBeenCalled()
  })

  it("denies a revoked/missing user session despite available aal2 claims", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "Session revoked" } })
    await expect(requireAdminUser()).rejects.toThrow("Debes iniciar sesión")
    expect(getClaims).not.toHaveBeenCalled()
  })

  it("permits only the configured user with matching verified aal2 claims", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "existing-admin-id", aal: "aal2" } }, error: null })
    await expect(requireAdminUser()).resolves.toMatchObject({ user: { id: "existing-admin-id" } })
    expect(getClaims).toHaveBeenCalledWith()
  })
})
