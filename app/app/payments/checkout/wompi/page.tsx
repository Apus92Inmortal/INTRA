import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AppNavbar } from "@/components/app-navbar"
import { createClient } from "@/lib/supabase/server"
import { formatCop, getPaymentResultLabel } from "@/lib/payments/wallet"
import {
  buildWompiCheckoutUrl,
  buildWompiIntegritySignature,
  isWompiSandbox,
  wompiAmountToCents,
} from "@/lib/wompi"

type CheckoutWompiPageProps = {
  searchParams?: Promise<{
    paymentId?: string
  }>
}

type PaymentRow = {
  id: string
  amount: number | string | null
  status: string | null
  external_reference: string | null
  currency: string | null
  shipment_id: string | null
}

function buildOrigin(host: string, proto: string) {
  return `${proto}://${host}`
}

export default async function CheckoutWompiPage({ searchParams }: CheckoutWompiPageProps) {
  const params = await searchParams
  const paymentId = params?.paymentId ?? ""
  const supabase = await createClient()
  const headerStore = await headers()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const paymentRes = user && paymentId
    ? await supabase
        .from("payments")
        .select("id, amount, status, external_reference, currency, shipment_id")
        .eq("id", paymentId)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null }

  const payment = (paymentRes.data ?? null) as PaymentRow | null
  const initialEvidenceRes = payment?.shipment_id
    ? await supabase
        .from("shipment_evidence")
        .select("id")
        .eq("shipment_id", payment.shipment_id)
        .eq("evidence_type", "customer_initial_photo")
        .limit(1)
    : { data: [] }
  const hasInitialEvidence = Boolean(initialEvidenceRes.data?.[0]?.id)
  const amount = Number(payment?.amount ?? 0)
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000"
  const proto = headerStore.get("x-forwarded-proto") ?? "https"
  const origin = buildOrigin(host, proto)

  const canStartCheckout =
    payment &&
    hasInitialEvidence &&
    payment.external_reference &&
    Number.isFinite(amount) &&
    amount > 0 &&
    (payment.status === "pending" || payment.status === "processing")
  const retryHref = payment ? `/app/payments/checkout?retryPaymentId=${payment.id}` : "/app/payments/checkout"

  if (payment?.shipment_id && !hasInitialEvidence) {
    redirect(`/app/payments/checkout?shipmentId=${payment.shipment_id}&evidenceRequired=1`)
  }

  if (canStartCheckout) {
    const amountInCents = wompiAmountToCents(amount)
    const redirectUrl = `${origin}/app/payments/checkout/return?paymentId=${payment.id}`
    const reference = payment.external_reference!
    const integritySignature = buildWompiIntegritySignature({
      reference,
      amountInCents,
      currency: payment.currency ?? "COP",
    })

    redirect(
      buildWompiCheckoutUrl({
        amountInCents,
        reference,
        integritySignature,
        currency: payment.currency ?? "COP",
        redirectUrl,
        customerEmail: user?.email ?? undefined,
      })
    )
  }

  return (
    <>
      <AppNavbar />
      <main className="intra-page-shell px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-intra-border-soft bg-intra-card p-6 shadow-sm sm:p-8">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-intra-blue">
                Checkout Wompi
              </p>
              <h1 className="mt-2 text-3xl font-bold text-intra-blue">
                No pudimos abrir el checkout
              </h1>
              <p className="mt-3 text-sm leading-6 text-intra-text-muted sm:text-base">
                Revisa el estado del pago y vuelve a intentarlo.
              </p>
            </div>

            {isWompiSandbox() ? (
              <div className="mt-6 rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-4 py-3 text-sm text-intra-warning-text">
                Estás usando Wompi Sandbox. Este flujo es de prueba.
              </div>
            ) : null}

            {payment ? (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-intra-bg-app p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted">Monto</p>
                  <p className="mt-2 text-xl font-bold text-intra-blue">{formatCop(amount)}</p>
                </div>
                <div className="rounded-2xl bg-intra-bg-app p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted">Estado</p>
                  <p className="mt-2 text-xl font-bold text-intra-blue">{getPaymentResultLabel(payment.status)}</p>
                </div>
                <div className="rounded-2xl bg-intra-bg-app p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted">Referencia</p>
                  <p className="mt-2 break-all text-sm font-semibold text-intra-blue">
                    {payment.external_reference ?? "Sin referencia"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-intra-danger-border bg-intra-danger-soft px-4 py-3 text-sm text-intra-danger">
                No encontramos un pago válido para abrir Wompi.
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={retryHref}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-intra-border-soft px-5 py-3 text-sm font-semibold text-intra-text-subtle transition hover:bg-intra-bg-app"
              >
                Reintentar pago
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
