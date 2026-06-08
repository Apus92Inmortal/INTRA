import { describe, expect, it } from "vitest"
import {
  buildBrowserAuthCallbackUrl,
  getPasswordRecoveryRedirectUrl,
  getResendVerificationErrorMessage,
  getResetPasswordErrorMessage,
  getSignupEmailRedirectUrl,
  getUpdatePasswordErrorMessage,
  getVerifyEmailSuccessPath,
  isUnconfirmedEmailMessage,
  validatePasswordChange,
} from "@/lib/auth-flows"

describe("auth-flows", () => {
  it("detects unconfirmed email messages", () => {
    expect(isUnconfirmedEmailMessage("Email not confirmed")).toBe(true)
    expect(isUnconfirmedEmailMessage("correo pendiente de confirmación")).toBe(true)
    expect(isUnconfirmedEmailMessage("Invalid login credentials")).toBe(false)
  })

  it("builds the verify-email success path with next", () => {
    expect(getVerifyEmailSuccessPath("/app/matches")).toBe(
      "/verify-email?status=verified&next=%2Fapp%2Fmatches"
    )
  })

  it("builds callback URLs for signup verification and recovery", () => {
    expect(buildBrowserAuthCallbackUrl("/login/update-password")).toBe(
      "https://intra-chi.vercel.app/auth/callback?next=%2Flogin%2Fupdate-password"
    )

    expect(getSignupEmailRedirectUrl("/app/profile")).toBe(
      "https://intra-chi.vercel.app/auth/callback?next=%2Fverify-email%3Fstatus%3Dverified%26next%3D%252Fapp%252Fprofile"
    )
  })

  it("uses update-password as the recovery redirect target", () => {
    expect(getPasswordRecoveryRedirectUrl()).toBe(
      "https://intra-chi.vercel.app/login/update-password"
    )
  })

  it("maps common auth errors to spanish UX messages", () => {
    expect(getResetPasswordErrorMessage("User not found")).toContain(
      "Si existe una cuenta"
    )
    expect(
      getResendVerificationErrorMessage("Email rate limit exceeded")
    ).toContain("reenviar el correo más tarde")
    expect(
      getUpdatePasswordErrorMessage("Auth session missing or token expired")
    ).toContain("inválido o expiró")
  })

  it("validates password change inputs", () => {
    expect(validatePasswordChange("123", "123")).toContain("al menos 6")
    expect(validatePasswordChange("123456", "654321")).toContain("no coinciden")
    expect(validatePasswordChange("123456", "123456")).toBeNull()
  })
})
