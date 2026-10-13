// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }))
import { isConfiguredAdmin, requireAdminUser } from "@/lib/auth/admin"

describe("admin identity authorization", () => {
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
  })
})
