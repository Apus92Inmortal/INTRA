import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyWompiEventSignature } from "@/lib/wompi"

function pickString(input: unknown, paths: string[][]) {
  if (!input || typeof input !== "object") return null

  for (const path of paths) {
    let current: unknown = input

    for (const segment of path) {
      if (!current || typeof current !== "object") {
        current = null
        break
      }

      current = (current as Record<string, unknown>)[segment]
    }

    if (typeof current === "string" && current.trim()) {
      return current.trim()
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "invalid_json" },
      { status: 400 }
    )
  }

  if (!verifyWompiEventSignature(payload as Parameters<typeof verifyWompiEventSignature>[0])) {
    return NextResponse.json(
      { success: false, error: "invalid_signature" },
      { status: 400 }
    )
  }

  const headers = Object.fromEntries(request.headers.entries())
  const transactionId = pickString(payload, [
    ["data", "transaction", "id"],
    ["transaction", "id"],
  ])
  const externalReference = pickString(payload, [
    ["data", "transaction", "reference"],
    ["reference"],
    ["data", "reference"],
  ])
  const status = pickString(payload, [
    ["data", "transaction", "status"],
    ["transaction", "status"],
    ["status"],
  ])
  const eventType = pickString(payload, [["event"], ["type"]])

  const eventKey =
    pickString(payload, [["data", "transaction", "id"], ["id"]]) ??
    externalReference ??
    crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")

  try {
    const supabase = createAdminClient()

    const { data: existingEvent } = await supabase
      .from("wompi_webhook_events")
      .select("id, processed")
      .eq("event_key", eventKey)
      .maybeSingle()

    if (existingEvent?.processed) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        eventId: existingEvent.id,
      })
    }

    const { data: eventRow, error: eventError } = await supabase
      .from("wompi_webhook_events")
      .upsert(
        {
          event_key: eventKey,
          event_type: eventType,
          gateway_transaction_id: transactionId,
          external_reference: externalReference,
          payload,
          headers,
        },
        {
          onConflict: "event_key",
        }
      )
      .select("id")
      .single()

    if (eventError) {
      return NextResponse.json(
        { success: false, error: eventError.message },
        { status: 500 }
      )
    }

    if (!transactionId && !externalReference) {
      await supabase
        .from("wompi_webhook_events")
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq("event_key", eventKey)

      return NextResponse.json({
        success: true,
        stored: true,
        skipped: true,
        reason: "missing_identifiers",
      })
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "process_wompi_payment_event",
      {
        p_gateway_transaction_id: transactionId,
        p_status: status,
        p_external_reference: externalReference,
        p_payload: payload,
      }
    )

    if (rpcError) {
      return NextResponse.json(
        { success: false, error: rpcError.message },
        { status: 500 }
      )
    }

    await supabase
      .from("wompi_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("event_key", eventKey)

    return NextResponse.json({
      success: true,
      eventId: eventRow?.id ?? null,
      result: rpcData,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "unexpected_webhook_error",
      },
      { status: 500 }
    )
  }
}
