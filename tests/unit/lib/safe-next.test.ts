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
})
