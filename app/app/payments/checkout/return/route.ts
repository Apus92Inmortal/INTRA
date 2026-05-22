import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getWompiTransaction, isWompiApprovedStatus, wompiAmountToCents } from "@/lib/wompi"

type PaymentRow = {
  id: string
  amount: number | string | null
  currency: string | null
  external_reference: string | null
  gateway_transaction_id: string | null
  status: string | null
  user_id: string | null
}

type WompiReturnTrace = {
  eventKey: string
  eventType?: string
  eventStatus?: string | null
  gatewayTransactionId?: string | null
  externalReference?: string | null
  payload: Record<string, unknown>
  processed?: boolean
  processingError?: string | null
}

function buildRedirectUrl(request: NextRequest, pathname: string, paymentId: string) {
  const url = new URL(pathname, request.url)
  url.searchParams.set("paymentId", paymentId)
  return url
}

function buildReturnEventKey(paymentId: string, transactionId: string, status?: string | null) {
  const normalizedStatus = status?.trim().toLowerCase() || "unknown"
  return ["wompi_redirect", paymentId, transactionId, normalizedStatus].join(":")
}

function buildInvalidReturnEventKey(paymentId: string, transactionId: string) {
  const fallback = crypto
    .createHash("sha256")
    .update(`${paymentId}:${transactionId}`)
    .digest("hex")

  return ["wompi_redirect", paymentId || "missing_payment", transactionId || fallback, "invalid"].join(":")
}

function getTraceHeaders(request: NextRequest) {
  return {
    "user-agent": request.headers.get("user-agent"),
    "x-forwarded-host": request.headers.get("x-forwarded-host"),
    "x-forwarded-proto": request.headers.get("x-forwarded-proto"),
  }
}

async function recordWompiReturnTrace(admin: ReturnType<typeof createAdminClient>, trace: WompiReturnTrace) {
  const { error } = await admin
    .from("wompi_webhook_events")
    .upsert(
      {
        event_key: trace.eventKey,
        event_type: trace.eventType ?? "wompi_redirect",
        event_status: trace.eventStatus ?? null,
        gateway_transaction_id: trace.gatewayTransactionId ?? null,
        external_reference: trace.externalReference ?? null,
        payload: trace.payload,
        headers: trace.payload.headers ?? {},
        processed: trace.processed ?? false,
        processed_at: trace.processed ? new Date().toISOString() : null,
        processing_error: trace.processingError ?? null,
      },
      {
        onConflict: "event_key",
      }
    )

  if (error) {
    console.error("Error storing Wompi return trace:", error.message)
  }
}

function validateWompiTransactionIdentity(payment: PaymentRow, transaction: Awaited<ReturnType<typeof getWompiTransaction>>) {
  if (!payment.external_reference || transaction.reference !== payment.external_reference) {
    return "reference_mismatch"
  }

  if (
    payment.gateway_transaction_id &&
    transaction.id &&
    payment.gateway_transaction_id !== transaction.id
  ) {
    return "transaction_mismatch"
  }

  const expectedAmount = wompiAmountToCents(Number(payment.amount ?? 0))
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0 || transaction.amount_in_cents !== expectedAmount) {
    return "amount_mismatch"
  }

  const expectedCurrency = (payment.currency ?? "COP").trim().toUpperCase()
  const transactionCurrency = (transaction.currency ?? "COP").trim().toUpperCase()
  if (transactionCurrency !== expectedCurrency) {
    return "currency_mismatch"
  }

  return null
}

function getAlreadyProcessedTargetPath(payment: PaymentRow, transactionStatus: string | null | undefined) {
  const normalizedStatus = (payment.status ?? "").trim().toLowerCase()

  if (isWompiApprovedStatus(transactionStatus) && (normalizedStatus === "held" || normalizedStatus === "released")) {
    return "/app/payments/success"
  }

  if (
    !isWompiApprovedStatus(transactionStatus) &&
    (normalizedStatus === "failed" || normalizedStatus === "cancelled" || normalizedStatus === "refunded")
  ) {
    return "/app/payments/failed"
  }

  return null
}

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get("paymentId")?.trim()
  const transactionId = request.nextUrl.searchParams.get("id")?.trim()

  if (!paymentId || !transactionId) {
    return NextResponse.redirect(
      buildRedirectUrl(request, "/app/payments/failed", paymentId ?? "")
    )
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        buildRedirectUrl(request, "/app/payments/failed", paymentId)
      )
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("id, amount, currency, external_reference, gateway_transaction_id, status, user_id")
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (paymentError || !payment) {
      return NextResponse.redirect(
        buildRedirectUrl(request, "/app/payments/failed", paymentId)
      )
    }

    const transaction = await getWompiTransaction(transactionId)
    const admin = createAdminClient()
    const eventKey = buildReturnEventKey(paymentId, transaction.id ?? transactionId, transaction.status)
    const tracePayload = {
      source: "wompi_redirect",
      payment_id: paymentId,
      user_id: user.id,
      transaction,
      headers: getTraceHeaders(request),
    }

    const paymentRow = payment as PaymentRow
    const validationError = validateWompiTransactionIdentity(paymentRow, transaction)

    if (validationError) {
      await recordWompiReturnTrace(admin, {
        eventKey: buildInvalidReturnEventKey(paymentId, transaction.id ?? transactionId),
        eventStatus: transaction.status ?? null,
        gatewayTransactionId: transaction.id ?? transactionId,
        externalReference: transaction.reference ?? null,
        payload: tracePayload,
        processingError: validationError,
      })

      return NextResponse.redirect(
        buildRedirectUrl(request, "/app/payments/failed", paymentId)
      )
    }

    const alreadyProcessedTargetPath = getAlreadyProcessedTargetPath(paymentRow, transaction.status)

    if (paymentRow.status !== "pending" && paymentRow.status !== "processing") {
      await recordWompiReturnTrace(admin, {
        eventKey,
        eventStatus: transaction.status ?? null,
        gatewayTransactionId: transaction.id ?? transactionId,
        externalReference: transaction.reference ?? null,
        payload: tracePayload,
        processed: Boolean(alreadyProcessedTargetPath),
        processingError: alreadyProcessedTargetPath ? null : "payment_not_processable",
      })

      return NextResponse.redirect(
        buildRedirectUrl(request, alreadyProcessedTargetPath ?? "/app/payments/failed", paymentId)
      )
    }

    await recordWompiReturnTrace(admin, {
      eventKey,
      eventStatus: transaction.status ?? null,
      gatewayTransactionId: transaction.id ?? transactionId,
      externalReference: transaction.reference ?? null,
      payload: tracePayload,
    })

    const { error } = await admin.rpc("process_wompi_payment_event", {
      p_gateway_transaction_id: transaction.id ?? transactionId,
      p_status: transaction.status ?? "PENDING",
      p_external_reference: transaction.reference ?? null,
      p_payload: tracePayload,
    })

    if (error) {
      await recordWompiReturnTrace(admin, {
        eventKey,
        eventStatus: transaction.status ?? null,
        gatewayTransactionId: transaction.id ?? transactionId,
        externalReference: transaction.reference ?? null,
        payload: tracePayload,
        processingError: error.message,
      })

      throw new Error(error.message)
    }

    await recordWompiReturnTrace(admin, {
      eventKey,
      eventStatus: transaction.status ?? null,
      gatewayTransactionId: transaction.id ?? transactionId,
      externalReference: transaction.reference ?? null,
      payload: tracePayload,
      processed: true,
    })

    const targetPath = isWompiApprovedStatus(transaction.status)
      ? "/app/payments/success"
      : "/app/payments/failed"

    return NextResponse.redirect(buildRedirectUrl(request, targetPath, paymentId))
  } catch {
    return NextResponse.redirect(
      buildRedirectUrl(request, "/app/payments/failed", paymentId)
    )
  }
}
