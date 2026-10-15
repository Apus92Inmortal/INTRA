import { describe, expect, it } from "vitest"
import { isProductionDatabaseBlocked } from "@/lib/supabase/environment"
describe("deployment database isolation", () => {
  const productionUrl = "https://okajyhkdyapbsornjeeb.supabase.co"
  it("blocks hosted preview/development access to the production project", () => {
    expect(isProductionDatabaseBlocked(productionUrl, "preview")).toBe(true)
    expect(isProductionDatabaseBlocked(productionUrl, "development")).toBe(true)
  })
  it("permits production and separate test projects", () => {
    expect(isProductionDatabaseBlocked(productionUrl, "production")).toBe(false)
    expect(isProductionDatabaseBlocked("https://isolated-test.supabase.co", "preview")).toBe(false)
  })
  it("rejects malformed non-production URLs", () => {
    expect(isProductionDatabaseBlocked("not-a-url", "preview")).toBe(true)
  })
})
