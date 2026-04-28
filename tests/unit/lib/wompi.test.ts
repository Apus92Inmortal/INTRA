import { describe, expect, it } from "vitest"
import {
  buildWompiCheckoutUrl,
  buildWompiIntegritySignature,
  verifyWompiEventSignature,
  wompiAmountToCents,
} from "@/lib/wompi"

describe("wompi helpers", () => {
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
        checksum: "71601CAC483195B4577030556A566645F0536A28DD5C0EA2BD16D4CD01EBCF31",
      },
    }

    expect(verifyWompiEventSignature(payload, "prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z")).toBe(true)
  })
})
