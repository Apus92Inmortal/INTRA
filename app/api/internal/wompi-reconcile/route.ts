import { NextRequest, NextResponse } from "next/server"
import { requireAdminUser } from "@/lib/auth/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import { getWompiTransaction } from "@/lib/wompi"

// Operator-driven reconciliation only: GET never mutates and this endpoint
// looks up an existing transaction; it never creates a charge or a payout.
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ success: false, error: "invalid_origin" }, { status: 403 })
  }
  let actorId: string
  try {
    actorId = (await requireAdminUser()).user.id
  } catch {
    return NextResponse.json({ success: false, error: "not_authorized" }, { status: 403 })
  }
  let eventId: string
  try {
    const body = await request.json()
    if (typeof body?.eventId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.eventId)) {
      throw new Error("invalid_event_id")
    }
    eventId = body.eventId
  } catch {
    return NextResponse.json({ success: false, error: "invalid_event_id" }, { status: 400 })
  }
  try {
    const admin = createAdminClient()
    const { data: event, error } = await admin.from("wompi_webhook_events")
      .select("id,event_key,event_type,gateway_transaction_id,processed,payload")
      .eq("id", eventId).maybeSingle()
    if (error) throw new Error("event_lookup_failed")
    if (!event) return NextResponse.json({ success: false, error: "event_not_found" }, { status: 404 })
    if (event.processed) return NextResponse.json({ success: true, duplicate: true, event_id: event.id })
    if (!["transaction.updated", "wompi_redirect"].includes(event.event_type) || !event.gateway_transaction_id) {
      return NextResponse.json({ success: false, error: "unsupported_event" }, { status: 409 })
    }
    const { error: auditError } = await admin.from("app_audit_logs").insert({
      actor_id: actorId, event_type: "admin_wompi_reconciliation_requested",
      entity_type: "wompi_webhook_event", entity_id: event.id,
      metadata: { source: "manual_operator_retry" },
    })
    if (auditError) throw new Error("audit_unavailable")
    const transaction = await getWompiTransaction(event.gateway_transaction_id)
    if (transaction.id !== event.gateway_transaction_id || !transaction.reference || !transaction.currency) {
      throw new Error("transaction_identity_mismatch")
    }
    const { data: result, error: rpcError } = await admin.rpc("ingest_wompi_payment_event", {
      p_event_key: event.event_key, p_event_type: event.event_type,
      p_gateway_transaction_id: transaction.id, p_status: transaction.status,
      p_external_reference: transaction.reference,
      p_payload: { ...event.payload, verified_transaction: transaction },
      p_headers: { source: "manual_operator_retry" },
    })
    if (rpcError || result?.success !== true) {
      return NextResponse.json({ success: false, error: result?.error ?? "reconciliation_failed" }, { status: 503 })
    }
    return NextResponse.json({ success: true, duplicate: result.duplicate ?? false, event_id: event.id })
  } catch {
    console.error("Manual Wompi reconciliation could not complete")
    return NextResponse.json({ success: false, error: "reconciliation_unavailable" }, { status: 503 })
  }
}
