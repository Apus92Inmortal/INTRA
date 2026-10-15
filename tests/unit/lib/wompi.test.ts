import crypto from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  buildWompiCheckoutUrl,
  buildWompiIntegritySignature,
  isWompiApprovedStatus,
  getWompiPublicKey,
  verifyWompiEventSignature,
  wompiAmountToCents,
} from "@/lib/wompi"

describe("wompi helpers", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("prevents hosted previews from using production payments", () => {
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("NEXT_PUBLIC_WOMPI_SANDBOX", "false")
    vi.stubEnv("NEXT_PUBLIC_WOMPI_PUBLIC_KEY", "pub_prod_example")
    expect(() => getWompiPublicKey()).toThrow("Sandbox es obligatorio")
    vi.stubEnv("NEXT_PUBLIC_WOMPI_SANDBOX", "true")
    expect(() => getWompiPublicKey()).toThrow("debe pertenecer a Wompi Sandbox")
    vi.stubEnv("NEXT_PUBLIC_WOMPI_PUBLIC_KEY", "pub_test_example")
    expect(getWompiPublicKey()).toBe("pub_test_example")
  })
  it("rejects malformed signatures without throwing", () => {
    expect(verifyWompiEventSignature(null, "test_secret")).toBe(false)
    expect(verifyWompiEventSignature({ signature: { checksum: 42 } }, "test_secret")).toBe(false)
    expect(verifyWompiEventSignature({ signature: { checksum: "0".repeat(64), properties: [42] }, timestamp: 123 }, "test_secret")).toBe(false)
  })
  it("rejects a valid checksum that does not sign the transaction identity", () => {
    const checksum = crypto.createHash("sha256").update("APPROVED123test_secret").digest("hex")
    expect(verifyWompiEventSignature({
      event: "transaction.updated", timestamp: 123,
      data: { transaction: { id: "unsigned-id", status: "APPROVED", amount_in_cents: 100 } },
      signature: { checksum, properties: ["transaction.status"] },
    }, "test_secret")).toBe(false)
  })
  it("converts COP amounts to cents", () => {
    expect(wompiAmountToCents(49500)).toBe(4950000)
  })

  it("builds integrity signature with expected order", () => {
    expect(
      buildWompiIntegritySignature(
        {
          reference: "ORDER-123",
          amountInCents: 4950000,
          currency: "COP",
        },
        "test_integrity_secret"
      )
    ).toBe("5542455916bc56a4fb511bd6183ec942aa4706cb4ba232c586b59547b8a2f541")
  })

  it("builds a web checkout url with encoded params", () => {
    process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY = "pub_test_123"

    const url = buildWompiCheckoutUrl({
      amountInCents: 4950000,
      reference: "ORDER-123",
      integritySignature: "sig-123",
      redirectUrl: "https://intra.test/return?paymentId=abc",
      customerEmail: "joy@example.com",
    })

    expect(url).toContain("https://checkout.wompi.co/p/?")
    expect(url).toContain("public-key=pub_test_123")
    expect(url).toContain("amount-in-cents=4950000")
    expect(url).toContain("reference=ORDER-123")
    expect(url).toContain("signature:integrity=sig-123")
    expect(url).toContain("redirect-url=https%3A%2F%2Fintra.test%2Freturn%3FpaymentId%3Dabc")
    expect(url).toContain("customer-data:email=joy%40example.com")
  })

  it("verifies wompi event signature", () => {
    const payload = {
      event: "transaction.updated",
      data: {
        transaction: {
          id: "01-123",
          status: "APPROVED",
          amount_in_cents: 4950000,
        },
      },
      signature: {
        properties: [
          "transaction.id",
          "transaction.status",
          "transaction.amount_in_cents",
        ],
        timestamp: 1530291411,
        checksum: "83CDB15DFE296E89EDC3F66DE0F56D98C43A7133646F4F72B23C50D6EEE1FB89",
      },
    }

    expect(verifyWompiEventSignature(payload, "test_events_unit_only")).toBe(true)
  })

  it("only treats approved transactions as success", () => {
    expect(isWompiApprovedStatus("APPROVED")).toBe(true)
    expect(isWompiApprovedStatus("approved")).toBe(true)
    expect(isWompiApprovedStatus("PENDING")).toBe(false)
    expect(isWompiApprovedStatus("DECLINED")).toBe(false)
    expect(isWompiApprovedStatus(undefined)).toBe(false)
  })
})
