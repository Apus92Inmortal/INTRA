import { getShipmentKindLabel, getStatusLabel } from "@/lib/labels";

describe("lib/labels", () => {
  it("returns translated shipment labels", () => {
    expect(getShipmentKindLabel("document")).toBe("Documento");
    expect(getShipmentKindLabel("package")).toBe("Paquete");
  });

  it("returns a default shipment label when kind is empty", () => {
    expect(getShipmentKindLabel(null)).toBe("Envío");
  });

  it("returns translated status labels", () => {
    expect(getStatusLabel("open")).toBe("Abierto");
    expect(getStatusLabel("in_transit")).toBe("En tránsito");
  });
});
