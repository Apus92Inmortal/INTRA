import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let authFlows: typeof import("@/lib/auth-flows")

describe("auth-flows", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined)
    authFlows = await import("@/lib/auth-flows")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("detects unconfirmed email messages", () => {
    expect(authFlows.isUnconfirmedEmailMessage("Email not confirmed")).toBe(true)
    expect(authFlows.isUnconfirmedEmailMessage("correo pendiente de confirmación")).toBe(true)
    expect(authFlows.isUnconfirmedEmailMessage("Invalid login credentials")).toBe(false)
  })

  it("builds the verify-email success path with next", () => {
    expect(authFlows.getVerifyEmailSuccessPath("/app/matches")).toBe(
      "/verify-email?status=verified&next=%2Fapp%2Fmatches"
    )
  })

  it("builds callback URLs for signup verification and recovery", () => {
    expect(authFlows.buildBrowserAuthCallbackUrl("/login/update-password")).toBe(
      "https://www.intra.com.co/auth/callback?next=%2Flogin%2Fupdate-password"
    )

    expect(authFlows.getSignupEmailRedirectUrl("/app/profile")).toBe(
      "https://www.intra.com.co/auth/callback?next=%2Fverify-email%3Fstatus%3Dverified%26next%3D%252Fapp%252Fprofile"
    )
  })

  it("uses update-password as the recovery redirect target", () => {
    expect(authFlows.getPasswordRecoveryRedirectUrl()).toBe(
      "https://www.intra.com.co/login/update-password"
    )
  })

  it("uses the configured isolated origin for callbacks and recovery", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://127.0.0.1:3000")
    vi.resetModules()
    const isolatedAuthFlows = await import("@/lib/auth-flows")

    expect(isolatedAuthFlows.buildBrowserAuthCallbackUrl("/app/matches")).toBe(
      "http://127.0.0.1:3000/auth/callback?next=%2Fapp%2Fmatches"
    )
    expect(isolatedAuthFlows.getSignupEmailRedirectUrl("/app/profile")).toBe(
      "http://127.0.0.1:3000/auth/callback?next=%2Fverify-email%3Fstatus%3Dverified%26next%3D%252Fapp%252Fprofile"
    )
    expect(isolatedAuthFlows.getPasswordRecoveryRedirectUrl()).toBe(
      "http://127.0.0.1:3000/login/update-password"
    )
  })

  it("maps common auth errors to spanish UX messages", () => {
    expect(authFlows.getResetPasswordErrorMessage("User not found")).toContain(
      "Si existe una cuenta"
    )
    expect(
      authFlows.getResendVerificationErrorMessage("Email rate limit exceeded")
    ).toContain("reenviar el correo más tarde")
    expect(
      authFlows.getUpdatePasswordErrorMessage("Auth session missing or token expired")
    ).toContain("inválido o expiró")
  })

  it("validates password change inputs", () => {
    expect(authFlows.validatePasswordChange("123", "123")).toContain("al menos 6")
    expect(authFlows.validatePasswordChange("123456", "654321")).toContain("no coinciden")
    expect(authFlows.validatePasswordChange("123456", "123456")).toBeNull()
  })
})
