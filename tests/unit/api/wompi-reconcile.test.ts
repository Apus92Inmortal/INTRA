// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({ requireAdminUser: vi.fn(), rpc: vi.fn(), find: vi.fn(), insert: vi.fn(), getWompiTransaction: vi.fn() }))
vi.mock("@/lib/auth/admin", () => ({ requireAdminUser: mocks.requireAdminUser }))
vi.mock("@/lib/wompi", () => ({ getWompiTransaction: mocks.getWompiTransaction }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  rpc: mocks.rpc,
  from: (table: string) => table === "app_audit_logs" ? { insert: mocks.insert } : {
    select: () => ({ eq: () => ({ maybeSingle: mocks.find }) }),
  },
}) }))
import { POST } from "@/app/api/internal/wompi-reconcile/route"

const eventId = "00000000-0000-4000-8000-000000000001"
const event = { id: eventId, event_key: "stored-key", event_type: "transaction.updated", gateway_transaction_id: "test-tx", processed: false, payload: {} }
function request(origin = "https://intra.test") {
  return new NextRequest("https://intra.test/api/internal/wompi-reconcile", {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ eventId }),
  })
}
describe("manual Wompi reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminUser.mockResolvedValue({ user: { id: "approved-admin" } })
    mocks.find.mockResolvedValue({ data: event, error: null })
    mocks.insert.mockResolvedValue({ error: null })
    mocks.getWompiTransaction.mockResolvedValue({ id: "test-tx", reference: "canonical-ref", currency: "COP", amount_in_cents: 100000, status: "APPROVED" })
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null })
  })
  it("rejects cross-origin requests before auth or writes", async () => {
    expect((await POST(request("https://attacker.test"))).status).toBe(403)
    expect(mocks.requireAdminUser).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })
  it("rejects a nonadmin before looking up payment data", async () => {
    mocks.requireAdminUser.mockRejectedValue(new Error("unauthorized"))
    expect((await POST(request())).status).toBe(403)
    expect(mocks.find).not.toHaveBeenCalled()
  })
  it("requires durable operator audit before applying reconciliation", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "failed" } })
    expect((await POST(request())).status).toBe(503)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it("reuses the existing event and Wompi's current authoritative transaction", async () => {
    expect((await POST(request())).status).toBe(200)
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ actor_id: "approved-admin", entity_id: eventId }))
    expect(mocks.rpc).toHaveBeenCalledWith("ingest_wompi_payment_event", expect.objectContaining({ p_event_key: "stored-key", p_external_reference: "canonical-ref" }))
  })
  it("returns a retryable error for business failure and does not report completion", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: false, error: "terminal_state_conflict" }, error: null })
    expect((await POST(request())).status).toBe(503)
  })
  it("does not replay an event already processed", async () => {
    mocks.find.mockResolvedValue({ data: { ...event, processed: true }, error: null })
    expect((await POST(request())).status).toBe(200)
    expect(mocks.getWompiTransaction).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
