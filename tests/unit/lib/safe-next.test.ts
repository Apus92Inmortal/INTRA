import { describe, expect, it } from "vitest"
import { getSafeInternalPath, isSafeInternalPath } from "@/lib/safe-next"

describe("safe-next", () => {
  it("accepts normal internal paths", () => {
    expect(isSafeInternalPath("/app")).toBe(true)
    expect(isSafeInternalPath("/app/matches/123")).toBe(true)
  })

  it("rejects protocol-relative and malformed paths", () => {
    expect(isSafeInternalPath("//evil.com")).toBe(false)
    expect(isSafeInternalPath("https://evil.com")).toBe(false)
    expect(isSafeInternalPath("\\evil")).toBe(false)
    expect(isSafeInternalPath("app")).toBe(false)
  })

  it("falls back to /app when path is unsafe", () => {
    expect(getSafeInternalPath("//evil.com")).toBe("/app")
    expect(getSafeInternalPath(undefined)).toBe("/app")
    expect(getSafeInternalPath("/app/profile")).toBe("/app/profile")
  })

  it.each(["\n", "\r", "\t"])("blocks an external URL hidden behind a %j control character", control => {
    const path = "/" + control + "/untrusted.example.test"
    // Demonstrates why a lexical startsWith('//') check alone is insufficient.
    expect(new URL(path, "https://www.intra.com.co").origin).toBe("https://untrusted.example.test")
    expect(isSafeInternalPath(path)).toBe(false)
    expect(new URL(getSafeInternalPath(path), "https://www.intra.com.co").origin).toBe("https://www.intra.com.co")
  })

  it("rejects every ASCII control in an otherwise internal path", () => {
    for (const code of [...Array.from({ length: 32 }, (_, index) => index), 127]) {
      expect(isSafeInternalPath("/app?tab=" + String.fromCharCode(code))).toBe(false)
    }
  })

  it("preserves legitimate query parameters, encoded values and fragments verbatim", () => {
    const path = "/app/matches/123?filter=accepted&returnTo=%2Fapp%3Ftab%3Dlogin#evidencia"
    expect(isSafeInternalPath(path)).toBe(true)
    expect(getSafeInternalPath(path)).toBe(path)
  })

  it("preserves a caller's legitimate internal fallback", () => {
    expect(getSafeInternalPath("https://untrusted.example.test", "/login/update-password")).toBe("/login/update-password")
    expect(getSafeInternalPath(undefined, "/app?tab=login#formulario")).toBe("/app?tab=login#formulario")
  })

  it("never returns an unsafe fallback", () => {
    expect(getSafeInternalPath(undefined, "https://untrusted.example.test")).toBe("/app")
    expect(getSafeInternalPath(undefined, "/\n/untrusted.example.test")).toBe("/app")
  })
})
