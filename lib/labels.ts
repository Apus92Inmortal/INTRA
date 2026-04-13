// ===== SHIPMENT KIND =====
export const shipmentKindLabels: Record<string, string> = {
  document: "Documento",
  package: "Paquete",
  ecommerce: "E-commerce",
};

export function getShipmentKindLabel(kind: string | null) {
  if (!kind) return "Envío";
  return shipmentKindLabels[kind] ?? kind;
}

// ===== STATUS =====
export function getStatusLabel(status: string | null) {
  switch (status) {
    case "open":
      return "Abierto";
    case "pending":
      return "Pendiente";
    case "accepted":
      return "Aceptado";
    case "rejected":
      return "Rechazado";
    case "cancelled":
      return "Cancelado";
    case "full":
      return "Lleno";
    case "matched":
      return "Con match";
    default:
      return status ?? "";
  }
}