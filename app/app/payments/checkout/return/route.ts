import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getWompiTransaction } from "@/lib/wompi"

function buildRedirectUrl(request: NextRequest, pathname: string, paymentId: string) {
  const url = new URL(pathname, request.url)
  url.searchParams.set("paymentId", paymentId)
  return url
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
    const transaction = await getWompiTransaction(transactionId)
    const supabase = createAdminClient()

    const { error } = await supabase.rpc("process_bold_webhook", {
      p_gateway_transaction_id: transaction.id ?? transactionId,
      p_status: transaction.status ?? "PENDING",
      p_external_reference: transaction.reference ?? null,
      p_payload: {
        source: "wompi_redirect",
        transaction,
      },
    })

    if (error) {
      throw new Error(error.message)
    }

    const normalizedStatus = (transaction.status ?? "").toLowerCase()
    const successStatuses = new Set(["approved", "paid", "success", "succeeded", "pending"])
    const targetPath = successStatuses.has(normalizedStatus)
      ? "/app/payments/success"
      : "/app/payments/failed"

    return NextResponse.redirect(buildRedirectUrl(request, targetPath, paymentId))
  } catch {
    return NextResponse.redirect(
      buildRedirectUrl(request, "/app/payments/failed", paymentId)
    )
  }
}
