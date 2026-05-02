import { describe, expect, it } from "vitest"
import {
  getPendingPaymentLabel,
  isShipmentPaymentReady,
  isShipmentPaymentRetryable,
} from "@/lib/payments/shipment-payment-state"

describe("shipment payment state", () => {
  it("detects ready payments", () => {
    expect(isShipmentPaymentReady("held")).toBe(true)
    expect(isShipmentPaymentReady("released")).toBe(true)
    expect(isShipmentPaymentReady("pending")).toBe(false)
    expect(isShipmentPaymentReady(null)).toBe(false)
  })

  it("detects retryable payments", () => {
    expect(isShipmentPaymentRetryable("failed")).toBe(true)
    expect(isShipmentPaymentRetryable("cancelled")).toBe(true)
    expect(isShipmentPaymentRetryable("pending")).toBe(false)
  })

  it("returns friendly labels for pending payment states", () => {
    expect(getPendingPaymentLabel(null)).toBe("Pendiente de pago")
    expect(getPendingPaymentLabel("pending")).toBe("Pendiente de pago")
    expect(getPendingPaymentLabel("failed")).toBe("Pago fallido")
    expect(getPendingPaymentLabel("cancelled")).toBe("Pago cancelado")
  })
})
