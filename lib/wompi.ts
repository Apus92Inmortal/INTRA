import crypto from "node:crypto"

const WOMPI_SANDBOX_BASE_URL = "https://sandbox.wompi.co/v1"
const WOMPI_PRODUCTION_BASE_URL = "https://production.wompi.co/v1"
export const WOMPI_WIDGET_URL = "https://checkout.wompi.co/widget.js"

type WompiEventSignature = {
  checksum?: string
  properties?: string[]
  timestamp?: number | string
}

type WompiEventPayload = {
  event?: string
  sent_at?: string
  timestamp?: number | string
  signature?: WompiEventSignature
  data?: {
    transaction?: {
      id?: string
      reference?: string
      status?: string
      amount_in_cents?: number
      currency?: string
      payment_method_type?: string
      status_message?: string
    }
  }
}

type WompiTransactionResponse = {
  data?: {
    id?: string
    reference?: string
    status?: string
    amount_in_cents?: number
    currency?: string
    payment_method_type?: string
    status_message?: string
    payment_method?: {
      type?: string
    }
  }
  error?: unknown
}

const WOMPI_APPROVED_STATUSES = new Set(["approved"])

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`)
  }

  return value
}

export function isWompiSandbox() {
  return process.env.NEXT_PUBLIC_WOMPI_SANDBOX === "true"
}

export function getWompiBaseUrl() {
  return isWompiSandbox() ? WOMPI_SANDBOX_BASE_URL : WOMPI_PRODUCTION_BASE_URL
}

export function getWompiPublicKey() {
  return getRequiredEnv("NEXT_PUBLIC_WOMPI_PUBLIC_KEY")
}

export function getWompiPrivateKey() {
  return getRequiredEnv("INTRA_WOMPI_PRIVATE_KEY")
}

export function getWompiEventsKey() {
  return getRequiredEnv("INTRA_WOMPI_EVENTS_KEY")
}

export function getWompiIntegrityKey() {
  return getRequiredEnv("INTRA_WOMPI_INTEGRITY_KEY")
}

export function wompiAmountToCents(amount: number) {
  return Math.round(amount * 100)
}

export function buildWompiIntegritySignature(
  {
    reference,
    amountInCents,
    currency = "COP",
    expirationTime,
  }: {
    reference: string
    amountInCents: number
    currency?: string
    expirationTime?: string
  },
  integrityKey = getWompiIntegrityKey()
) {
  const raw = `${reference}${amountInCents}${currency}${expirationTime ?? ""}${integrityKey}`
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export function buildWompiCheckoutUrl({
  amountInCents,
  reference,
  integritySignature,
  currency = "COP",
  redirectUrl,
  expirationTime,
  customerEmail,
}: {
  amountInCents: number
  reference: string
  integritySignature: string
  currency?: string
  redirectUrl?: string
  expirationTime?: string
  customerEmail?: string
}) {
  const params: Array<[string, string]> = [
    ["public-key", getWompiPublicKey()],
    ["currency", currency],
    ["amount-in-cents", String(amountInCents)],
    ["reference", reference],
    ["signature:integrity", integritySignature],
  ]

  if (redirectUrl?.trim()) {
    params.push(["redirect-url", redirectUrl.trim()])
  }

  if (expirationTime?.trim()) {
    params.push(["expiration-time", expirationTime.trim()])
  }

  if (customerEmail?.trim()) {
    params.push(["customer-data:email", customerEmail.trim()])
  }

  const query = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&")

  return `https://checkout.wompi.co/p/?${query}`
}

function getNestedValue(input: unknown, path: string) {
  const normalizedPath = path.replace(/^data\./, "")
  const segments = normalizedPath.split(".").filter(Boolean)

  let current: unknown = input

  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return ""
    }

    current = (current as Record<string, unknown>)[segment]
  }

  if (current === null || current === undefined) {
    return ""
  }

  if (typeof current === "string" || typeof current === "number" || typeof current === "boolean") {
    return String(current)
  }

  return ""
}

export function verifyWompiEventSignature(
  payload: WompiEventPayload,
  eventsKey = getWompiEventsKey()
) {
  const signature = payload.signature

  if (!signature?.checksum || !Array.isArray(signature.properties) || signature.properties.length === 0) {
    return false
  }

  const timestamp = String(signature.timestamp ?? payload.timestamp ?? "")

  if (!timestamp) {
    return false
  }

  const joinedValues = signature.properties
    .map((property) => getNestedValue(payload.data ?? {}, property))
    .join("")

  const raw = `${joinedValues}${timestamp}${eventsKey}`
  const expected = crypto.createHash("sha256").update(raw).digest("hex").toUpperCase()

  return expected === signature.checksum.toUpperCase()
}

export function isWompiApprovedStatus(status: string | null | undefined) {
  return WOMPI_APPROVED_STATUSES.has((status ?? "").trim().toLowerCase())
}

export async function getWompiTransaction(transactionId: string) {
  const response = await fetch(
    `${getWompiBaseUrl()}/transactions/${encodeURIComponent(transactionId)}`,
    {
      headers: {
        Authorization: `Bearer ${getWompiPublicKey()}`,
      },
      cache: "no-store",
    }
  )

  let body: WompiTransactionResponse | null = null

  try {
    body = (await response.json()) as WompiTransactionResponse
  } catch {
    body = null
  }

  if (!response.ok) {
    throw new Error(
      `Wompi transaction lookup failed (${response.status}): ${JSON.stringify(body?.error ?? body ?? {})}`
    )
  }

  if (!body?.data?.id) {
    throw new Error("Wompi no devolvió una transacción válida.")
  }

  return body.data
}
