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
    case "closed":
      return "Cerrado";
    case "completed":
      return "Completado";
    case "full":
      return "Lleno";
    case "matched":
      return "Emparejado";
    case "in_transit":
      return "En tránsito";
    case "delivered":
      return "Entregado";
    case "held":
      return "Retenido";
    case "processing":
      return "Procesando";
    case "released":
      return "Liberado";
    case "refunded":
      return "Reembolsado";
    case "failed":
      return "Fallido";
    case "disputed":
      return "En disputa";
    case "resolved":
      return "Resuelto";
    default:
      return status ?? "";
  }
}
