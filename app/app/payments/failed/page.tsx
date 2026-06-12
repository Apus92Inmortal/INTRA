import Link from "next/link"
import { CircleAlert } from "lucide-react"
import { AppNavbar } from "@/components/app-navbar"
import { formatCop } from "@/lib/payments/wallet"
import { createClient } from "@/lib/supabase/server"

type PaymentFailedPageProps = {
  searchParams?: Promise<{
    paymentId?: string
  }>
}

type PaymentRow = {
  id: string
  amount: number | null
  status: string | null
  external_reference: string | null
}

function buildTrackingCode(reference: string | null | undefined, paymentId: string | null | undefined) {
  const source = reference?.trim() || paymentId?.trim() || ""
  const compact = source.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()

  if (!compact) {
    return "INTRA-PENDIENTE"
  }

  return `INTRA-${compact.slice(-6)}`
}

export default async function PaymentFailedPage({ searchParams }: PaymentFailedPageProps) {
  const params = await searchParams
  const paymentId = params?.paymentId ?? ""
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const paymentRes = user && paymentId
    ? await supabase
        .from("payments")
        .select("id, amount, status, external_reference")
        .eq("id", paymentId)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null }

  const payment = (paymentRes.data ?? null) as PaymentRow | null
  const amount = Number(payment?.amount ?? 0)
  const trackingCode = buildTrackingCode(payment?.external_reference, paymentId)
  const retryHref = payment ? `/app/payments/checkout?retryPaymentId=${payment.id}` : "/app/payments/checkout"

  return (
    <>
      <AppNavbar />
      <main className="intra-page-shell px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center">
          <section className="w-full rounded-[24px] border border-intra-danger-border bg-intra-card p-4 shadow-sm sm:p-7">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-intra-danger-soft text-intra-danger sm:h-14 sm:w-14">
              <CircleAlert className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.8} aria-hidden="true" />
            </div>

            <div className="mt-4 text-center sm:mt-5">
              <p className="intra-badge-text text-intra-danger">PAGO NO COMPLETADO</p>
              <h1 className="mt-2 intra-h1 text-intra-blue">No se completó el pago</h1>
              <p className="mx-auto mt-2 max-w-xl intra-body text-intra-text-muted sm:mt-3">
                Revisa el método de pago e inténtalo nuevamente.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2">
              <div className="flex min-h-20 flex-col gap-1.5 rounded-2xl bg-intra-bg-app p-3 sm:p-4">
                <p className="intra-badge-text uppercase text-intra-text-muted">Monto</p>
                <p className="intra-body-strong text-intra-blue">{formatCop(Number.isFinite(amount) ? amount : 0)}</p>
              </div>
              <div className="flex min-h-20 flex-col gap-1.5 rounded-2xl bg-intra-bg-app p-3 sm:p-4">
                <p className="intra-badge-text uppercase text-intra-text-muted">Estado</p>
                <p className="intra-body-strong text-intra-blue">Pago no completado</p>
              </div>
              <div className="flex min-h-20 flex-col gap-1.5 rounded-2xl bg-intra-bg-app p-3 sm:p-4">
                <p className="intra-badge-text uppercase text-intra-text-muted">Código de rastreo</p>
                <p className="intra-body-strong text-intra-blue">{trackingCode}</p>
              </div>
              <div className="flex min-h-20 flex-col gap-1.5 rounded-2xl bg-intra-bg-app p-3 sm:p-4">
                <p className="intra-badge-text uppercase text-intra-text-muted">Recomendación</p>
                <p className="intra-body-strong text-intra-blue">Revisa tu método</p>
              </div>
            </div>

            {!paymentId || !payment ? (
              <div className="mt-5 rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-4 py-3 intra-body text-intra-warning-text">
                No pudimos cargar el detalle completo de este pago.
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:justify-center">
              <Link
                href={retryHref}
                className="intra-btn intra-btn-primary min-h-12 w-full sm:w-56"
              >
                Reintentar pago
              </Link>
              <Link
                href="/app#pendientes-de-pago"
                className="intra-btn intra-btn-secondary min-h-12 w-full sm:w-56"
              >
                Volver al inicio
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
