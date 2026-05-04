export const SHIPMENT_DECLARATION_VERSION = "1.0"

export const SHIPMENT_DECLARATION_TEXT =
  "Declaro que el contenido de este envío es lícito, corresponde a la información registrada y no contiene artículos prohibidos por la ley colombiana (armas, drogas, explosivos, dinero en efectivo, mercancía ilegal o falsificada, materiales peligrosos). Entiendo que mi identidad verificada queda asociada a este envío y que cualquier falsedad será mi responsabilidad exclusiva."

export type CreateShipmentDraftResult = {
  success: boolean
  error?: string
  message?: string
  shipment_id?: string
  payment_id?: string
  tracking_code?: string
  verification_status?: string
}

export function parseCreateShipmentDraftResult(data: unknown): CreateShipmentDraftResult | null {
  if (!data || typeof data !== "object") {
    return null
  }

  const raw = data as Record<string, unknown>

  return {
    success: raw.success === true,
    error: typeof raw.error === "string" ? raw.error : undefined,
    message: typeof raw.message === "string" ? raw.message : undefined,
    shipment_id: typeof raw.shipment_id === "string" ? raw.shipment_id : undefined,
    payment_id: typeof raw.payment_id === "string" ? raw.payment_id : undefined,
    tracking_code: typeof raw.tracking_code === "string" ? raw.tracking_code : undefined,
    verification_status: typeof raw.verification_status === "string" ? raw.verification_status : undefined,
  }
}

export function getCreateShipmentDraftErrorMessage(errorCode: string | null | undefined) {
  switch (errorCode) {
    case "not_authenticated":
      return "Debes iniciar sesión para completar el pago."
    case "route_required":
      return "Debes seleccionar el origen y el destino del envío."
    case "same_route":
      return "Origen y destino no pueden ser iguales."
    case "kind_not_allowed":
      return "El tipo de envío seleccionado no es válido."
    case "invalid_description":
      return "Agrega una descripción más clara del contenido para continuar."
    case "invalid_weight":
      return "El peso del envío no es válido."
    case "invalid_declared_value":
      return "El valor declarado no es válido."
    case "declaration_required":
      return "Debes aceptar la declaración responsable para continuar."
    case "declared_value_limit_exceeded":
      return "Como tu cuenta aún no está verificada, el valor declarado máximo por envío es $200.000 COP."
    case "active_shipment_limit_exceeded":
      return "Las cuentas sin verificar solo pueden tener 3 envíos activos al mismo tiempo."
    case "weekly_shipment_limit_exceeded":
      return "Las cuentas sin verificar pueden crear hasta 5 envíos por semana."
    case "route_not_available":
      return "No hay tarifa configurada para esta ruta."
    case "below_minimum":
      return "La tarifa de esta ruta quedó por debajo del mínimo permitido."
    case "invalid_route_margin":
      return "La tarifa configurada para esta ruta no deja margen válido para el pago seguro."
    case "tracking_code_generation_failed":
      return "No pudimos generar el código único del envío. Inténtalo de nuevo."
    case "quote_error":
      return "No se pudo calcular el pago seguro para este envío."
    default:
      return "No se pudo preparar el envío y el pago seguro. Inténtalo de nuevo."
  }
}
