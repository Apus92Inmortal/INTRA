// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), verify: vi.fn(), transaction: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }))
vi.mock("@/lib/wompi", () => ({
  verifyWompiEventSignature: mocks.verify,
  getWompiTransaction: mocks.transaction,
  isWompiSandbox: () => false,
}))
import { POST } from "@/app/api/webhooks/wompi/route"
const transaction = { id: "tx-1", status: "APPROVED", reference: "ref-1", amount_in_cents: 2000000, currency: "COP" }
const payload = () => ({ event: "transaction.updated", environment: "prod", data: { transaction: { ...transaction } }, timestamp: 123 })
const request = (body: unknown) => new NextRequest("https://intra.test/api/webhooks/wompi", {
  method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", cookie: "private_cookie", authorization: "private_header" },
})
beforeEach(() => {
  vi.clearAllMocks()
  mocks.verify.mockReturnValue(true)
  mocks.transaction.mockResolvedValue({ ...transaction })
  mocks.rpc.mockImplementation(async (name: string) => ({ data: name === "record_wompi_delivery" ? { success: true, processed: false } : { success: true, status: "held" }, error: null }))
})
describe("Wompi delivery acknowledgement", () => {
  it("keeps a functional reconciliation failure retryable", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { success: true, processed: false }, error: null })
      .mockResolvedValueOnce({ data: { success: false, error: "payment_not_found" }, error: null })
    expect((await POST(request(payload()))).status).toBe(503)
    expect(mocks.rpc).toHaveBeenCalledTimes(2)
  })
  it("does not acknowledge malformed RPC success", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { success: true, processed: false }, error: null }).mockResolvedValueOnce({ data: null, error: null })
    expect((await POST(request(payload()))).status).toBe(503)
  })
  it("acknowledges a reconciled delivery or duplicate", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { success: true, processed: true }, error: null })
    expect((await POST(request(payload()))).status).toBe(200)
  })
  it("retries transport and provider lookup failures", async () => {
    mocks.transaction.mockRejectedValue(new Error("provider unavailable"))
    expect((await POST(request(payload()))).status).toBe(503)
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    expect(mocks.rpc.mock.calls[0][0]).toBe("record_wompi_delivery")
  })
  it("rejects invalid signatures before database/provider calls", async () => {
    mocks.verify.mockReturnValue(false)
    expect((await POST(request(payload()))).status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
  it("rejects a sandbox delivery at the production endpoint", async () => {
    expect((await POST(request({ ...payload(), environment: "test" }))).status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it("uses the provider reference and state, without storing cookies or auth headers", async () => {
    const raw = payload()
    raw.data.transaction.reference = "tampered-reference"
    raw.data.transaction.status = "PENDING"
    await POST(request(raw))
    const args = mocks.rpc.mock.calls[1][1]
    expect(args.p_external_reference).toBe("ref-1")
    expect(args.p_status).toBe("APPROVED")
    expect(args.p_payload.data.transaction.reference).toBe("tampered-reference")
    expect(args.p_payload.verified_transaction.reference).toBe("ref-1")
    expect(args.p_headers).not.toHaveProperty("cookie")
    expect(args.p_headers).not.toHaveProperty("authorization")
  })
  it("rejects a discrepancy with the signed amount", async () => {
    mocks.transaction.mockResolvedValue({ ...transaction, amount_in_cents: 123 })
    expect((await POST(request(payload()))).status).toBe(400)
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
  })
  it("stores other signed event types without a transaction lookup", async () => {
    expect((await POST(request({ event: "nequi_token.updated" }))).status).toBe(200)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
