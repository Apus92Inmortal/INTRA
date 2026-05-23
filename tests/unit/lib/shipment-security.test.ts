import { describe, expect, it } from "vitest"
import {
  getCreateShipmentDraftErrorMessage,
  parseCreateShipmentDraftResult,
  SHIPMENT_DECLARATION_SUMMARY,
  SHIPMENT_DECLARATION_TEXT,
  SHIPMENT_DECLARATION_VERSION,
  SHIPMENT_MAX_WEIGHT_KG,
  UNVERIFIED_DECLARED_VALUE_LIMIT_COP,
  VERIFIED_DECLARED_VALUE_LIMIT_COP,
} from "@/lib/shipments/security"

describe("shipment security helpers", () => {
  it("exposes the current declaration contract", () => {
    expect(SHIPMENT_DECLARATION_VERSION).toBe("1.0")
    expect(SHIPMENT_DECLARATION_TEXT).toContain("artículos prohibidos")
    expect(SHIPMENT_DECLARATION_SUMMARY).toContain("veracidad")
    expect(SHIPMENT_MAX_WEIGHT_KG).toBe(10)
    expect(UNVERIFIED_DECLARED_VALUE_LIMIT_COP).toBe(300000)
    expect(VERIFIED_DECLARED_VALUE_LIMIT_COP).toBe(2000000)
  })

  it("parses shipment draft rpc responses", () => {
    expect(
      parseCreateShipmentDraftResult({
        success: true,
        shipment_id: "shipment-1",
        payment_id: "payment-1",
        tracking_code: "INTRA-ABC12345",
        verification_status: "unverified",
      })
    ).toEqual({
      success: true,
      shipment_id: "shipment-1",
      payment_id: "payment-1",
      tracking_code: "INTRA-ABC12345",
      verification_status: "unverified",
      error: undefined,
      message: undefined,
    })

    expect(parseCreateShipmentDraftResult(null)).toBeNull()
  })

  it("maps backend error codes to user-facing copy", () => {
    expect(getCreateShipmentDraftErrorMessage("declaration_required")).toContain("declaración responsable")
    expect(getCreateShipmentDraftErrorMessage("declared_value_limit_exceeded")).toContain("$300.000")
    expect(getCreateShipmentDraftErrorMessage("weight_limit_exceeded")).toContain("10 kg")
    expect(getCreateShipmentDraftErrorMessage("unknown_code")).toContain("No se pudo preparar")
  })
})
