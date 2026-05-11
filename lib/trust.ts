export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected"

export function getVerificationBadge(status: string | null | undefined) {
  switch (status) {
    case "verified":
      return {
        label: "Identidad verificada",
        classes: "bg-intra-success-soft text-intra-text-success",
        description: "Tu identidad ya fue revisada manualmente por el equipo.",
      }
    case "pending":
      return {
        label: "Verificación en revisión",
        classes: "bg-intra-warning-soft text-intra-warning-text",
        description: "Ya recibimos tus documentos. El equipo los revisará manualmente.",
      }
    case "rejected":
      return {
        label: "Verificación rechazada",
        classes: "bg-intra-danger-soft text-intra-danger",
        description: "Necesitas corregir la evidencia cargada para volver a enviarla.",
      }
    default:
      return {
        label: "Sin verificar",
        classes: "border border-intra-warning-border bg-intra-warning-soft text-intra-warning-text",
        description: "Aún no has enviado tu documento ni tu selfie para revisión manual.",
      }
  }
}

export function getEvidenceTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "pickup":
      return "Recogida"
    case "delivery":
      return "Entrega"
    case "package_state":
      return "Estado del paquete"
    default:
      return "Evidencia"
  }
}

export function getReportStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "reviewing":
      return "En revisión"
    case "resolved":
      return "Resuelto"
    default:
      return "Abierto"
  }
}
