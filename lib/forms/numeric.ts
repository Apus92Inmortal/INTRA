export function sanitizeDecimalInput(value: string) {
  const normalized = value.replace(/,/g, ".").replace(/[^\d.]/g, "")
  const [integerPart = "", ...decimalParts] = normalized.split(".")

  if (decimalParts.length === 0) {
    return integerPart
  }

  return `${integerPart}.${decimalParts.join("")}`
}

export function sanitizeIntegerInput(value: string) {
  return value.replace(/\D/g, "")
}

/**
 * Formatea un string de dígitos con separadores de miles (punto).
 * Útil para visualización de pesos colombianos.
 */
export function formatThousands(value: string) {
  const digits = value.replace(/\D/g, "")
  if (!digits) return ""
  return new Intl.NumberFormat("es-CO").format(Number(digits))
}

/**
 * Remueve separadores de miles y devuelve solo los dígitos.
 */
export function parseThousands(value: string) {
  return value.replace(/\D/g, "")
}

export function parseNormalizedNumber(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Parsea un valor formateado con miles (puntos) a un número limpio.
 * Solo para enteros (como pesos COP).
 */
export function parseIntegerWithThousands(value: string) {
  const clean = value.replace(/\./g, "").trim()
  if (!clean) return null
  const parsed = Number(clean)
  return Number.isFinite(parsed) ? parsed : null
}
