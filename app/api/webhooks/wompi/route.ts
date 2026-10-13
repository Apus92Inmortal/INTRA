import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getWompiTransaction, isWompiSandbox, verifyWompiEventSignature } from "@/lib/wompi"

export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "invalid_json" }, { status: 400 })
  }
  try {
    if (!verifyWompiEventSignature(payload)) {
      return NextResponse.json({ success: false, error: "invalid_signature" }, { status: 400 })
    }
    const event = payload as {
      event?: string
      environment?: string
      data?: { transaction?: { id?: string; status?: string; reference?: string; amount_in_cents?: number; currency?: string } }
    }
    const eventType = event.event ?? "unknown"
    const eventIdentity = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")
    const headers = {
      "content-type": request.headers.get("content-type"),
      "user-agent": request.headers.get("user-agent"),
    }
    if (eventType !== "transaction.updated") {
      const { data, error } = await createAdminClient().rpc("ingest_wompi_payment_event", {
        p_event_key: `wompi:${eventIdentity}`, p_event_type: eventType,
        p_gateway_transaction_id: null, p_status: null, p_external_reference: null,
        p_payload: payload, p_headers: headers,
      })
      if (error || data?.success !== true) {
        return NextResponse.json({ success: false, error: "event_storage_failed" }, { status: 503 })
      }
      return NextResponse.json(data)
    }
    const transactionId = event.data?.transaction?.id
    if (typeof transactionId !== "string" || !transactionId.trim()) {
      return NextResponse.json({ success: false, error: "missing_transaction_id" }, { status: 400 })
    }
    if (event.environment !== (isWompiSandbox() ? "test" : "prod")) {
      return NextResponse.json({ success: false, error: "environment_mismatch" }, { status: 400 })
    }
    const admin = createAdminClient()
    const stored = await admin.rpc("record_wompi_delivery", {
      p_event_key: `wompi:${eventIdentity}`, p_event_type: eventType,
      p_gateway_transaction_id: transactionId, p_status: event.data?.transaction?.status ?? null,
      p_external_reference: event.data?.transaction?.reference ?? null,
      p_payload: payload, p_headers: headers,
    })
    if (stored.error || stored.data?.success !== true) {
      return NextResponse.json({ success: false, error: "event_storage_failed" }, { status: 503 })
    }
    if (stored.data.processed === true) {
      return NextResponse.json({ success: true, duplicate: true, event_id: stored.data.event_id })
    }
    // Default signatures do not cover reference/currency. Resolve the signed ID
    // at Wompi before trusting those fields or applying its current state.
    const transaction = await getWompiTransaction(transactionId)
    if (transaction.id !== transactionId || !transaction.reference || !transaction.currency ||
      transaction.amount_in_cents !== event.data?.transaction?.amount_in_cents ||
      transaction.currency !== event.data?.transaction?.currency) {
      return NextResponse.json({ success: false, error: "transaction_identity_mismatch" }, { status: 400 })
    }
    const { data, error } = await admin.rpc("ingest_wompi_payment_event", {
      p_event_key: `wompi:${eventIdentity}`, p_event_type: eventType,
      p_gateway_transaction_id: transaction.id, p_status: transaction.status,
      p_external_reference: transaction.reference,
      p_payload: { ...(payload as Record<string, unknown>), verified_transaction: transaction },
      p_headers: headers,
    })
    if (error || data?.success !== true) {
      console.error("Wompi reconciliation failed", { error: error?.code ?? data?.error ?? "invalid_rpc_result" })
      return NextResponse.json({ success: false, error: data?.error ?? "reconciliation_failed" }, { status: 503 })
    }
    return NextResponse.json(data)
  } catch {
    console.error("Wompi webhook could not reconcile the event")
    return NextResponse.json({ success: false, error: "webhook_unavailable" }, { status: 503 })
  }
}
