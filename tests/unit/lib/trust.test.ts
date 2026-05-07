import { describe, expect, it } from "vitest"
import { getEvidenceTypeLabel, getReportStatusLabel, getVerificationBadge } from "@/lib/trust"

describe("trust helpers", () => {
  it("returns verified badge copy", () => {
    const badge = getVerificationBadge("verified")
    expect(badge.label).toBe("Identidad verificada")
    expect(badge.classes).toContain("emerald")
  })

  it("maps evidence types to user facing labels", () => {
    expect(getEvidenceTypeLabel("pickup")).toBe("Recogida")
    expect(getEvidenceTypeLabel("delivery")).toBe("Entrega")
    expect(getEvidenceTypeLabel("package_state")).toBe("Estado del paquete")
  })

  it("maps report statuses to readable labels", () => {
    expect(getReportStatusLabel("open")).toBe("Abierto")
    expect(getReportStatusLabel("reviewing")).toBe("En revisión")
    expect(getReportStatusLabel("resolved")).toBe("Resuelto")
  })
})
