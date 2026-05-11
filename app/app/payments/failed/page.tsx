import Link from "next/link"
import { AppNavbar } from "@/components/app-navbar"
import { formatCop, getPaymentResultLabel } from "@/lib/payments/wallet"
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
  const paymentStatus = payment?.status ?? "failed"
  const reference = payment?.external_reference ?? "Sin referencia"
  const retryHref = payment ? `/app/payments/checkout?retryPaymentId=${payment.id}` : "/app/payments/checkout"

  return (
    <>
      <AppNavbar />
      <main className="intra-page-shell px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-intra-danger-border bg-intra-card p-6 shadow-sm sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-intra-danger-soft text-intra-danger">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-intra-danger">Pago no completado</p>
              <h1 className="mt-2 text-3xl font-bold text-intra-blue">No pudimos registrar el pago</h1>
              <p className="mt-3 text-sm leading-6 text-intra-text-muted sm:text-base">
                Puedes revisar los datos e intentarlo de nuevo. Esta pantalla ya no depende de datos operativos visibles en la URL.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-intra-bg-app p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted">Monto</p>
                <p className="mt-2 text-xl font-bold text-intra-blue">{formatCop(Number.isFinite(amount) ? amount : 0)}</p>
              </div>
              <div className="rounded-2xl bg-intra-bg-app p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted">Estado</p>
                <p className="mt-2 text-xl font-bold text-intra-blue">{getPaymentResultLabel(paymentStatus)}</p>
              </div>
              <div className="rounded-2xl bg-intra-bg-app p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted">Referencia</p>
                <p className="mt-2 break-all text-sm font-semibold text-intra-blue">{reference}</p>
                <p className="mt-3 text-sm text-intra-text-muted">Motivo: revisa el método de pago e inténtalo de nuevo.</p>
              </div>
            </div>

            {!paymentId || !payment ? (
              <div className="mt-6 rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-4 py-3 text-sm text-intra-warning-text">
                Si llegaste aquí sin un pago asociado, puedes volver al checkout sin haber expuesto identificadores del envío en el navegador.
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={retryHref}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-intra-blue px-5 py-3 text-sm font-semibold text-intra-card transition hover:bg-intra-blue-hover-card"
              >
                Reintentar pago
              </Link>
              <Link
                href="/app#pendientes-de-pago"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-intra-border-soft px-5 py-3 text-sm font-semibold text-intra-text-subtle transition hover:bg-intra-bg-app"
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
