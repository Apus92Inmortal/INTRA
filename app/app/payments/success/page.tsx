import Link from "next/link"
import { AppNavbar } from "@/components/app-navbar"
import { formatCop, getPaymentResultLabel } from "@/lib/payments/wallet"
import { createClient } from "@/lib/supabase/server"

type PaymentSuccessPageProps = {
  searchParams?: Promise<{
    paymentId?: string
  }>
}

type PaymentRow = {
  id: string
  amount: number | null
  status: string | null
  external_reference: string | null
  payment_method: string | null
}

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const params = await searchParams
  const paymentId = params?.paymentId ?? ""
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const paymentRes = user && paymentId
    ? await supabase
        .from("payments")
        .select("id, amount, status, external_reference, payment_method")
        .eq("id", paymentId)
        .maybeSingle()
    : { data: null }

  const payment = (paymentRes.data ?? null) as PaymentRow | null
  const amount = Number(payment?.amount ?? 0)
  const paymentStatus = payment?.status ?? "processing"
  const reference = payment?.external_reference ?? "Pendiente"
  const method =
    payment?.payment_method === "simulated"
      ? "Pago seguro"
      : payment?.payment_method === "wompi_widget"
      ? "Wompi"
      : payment?.payment_method ?? "Pago seguro"
  const isConfirmed = paymentStatus === "held" || paymentStatus === "released"
  const eyebrow = isConfirmed ? "Pago seguro confirmado" : "Pago en validación"
  const title = isConfirmed ? "Tu pago quedó registrado" : "Estamos confirmando tu pago"
  const description = isConfirmed
    ? "El dinero quedó bajo retención temporal y se liberará al viajero cuando confirmes la entrega, o automáticamente al cumplirse la ventana configurada."
    : "Wompi ya recibió la transacción. Estamos esperando la confirmación final para dejar el pago en retención temporal."

  return (
    <>
      <AppNavbar />
      <main className="intra-page-shell px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-intra-success-border bg-intra-card p-6 shadow-sm sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-intra-success-soft text-intra-text-success">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-intra-text-success">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-bold text-intra-blue">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-intra-text-muted sm:text-base">
                {description}
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
              <div className="rounded-2xl bg-intra-bg-app p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted">Referencia</p>
                <p className="mt-2 break-all text-sm font-semibold text-intra-blue">{reference}</p>
              </div>
              <div className="rounded-2xl bg-intra-bg-app p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted">Método</p>
                <p className="mt-2 text-sm font-semibold text-intra-blue">{method}</p>
              </div>
            </div>

            {!paymentId || !payment ? (
              <div className="mt-6 rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-4 py-3 text-sm text-intra-warning-text">
                No pudimos recuperar todos los detalles del pago desde este enlace, pero el flujo quedó protegido sin exponer datos en la URL.
              </div>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/app/matches"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-intra-blue px-5 py-3 text-sm font-semibold text-intra-card transition hover:bg-intra-blue-hover-card"
              >
                Ir a mis matches
              </Link>
              <Link
                href="/app/wallet"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-intra-border-soft px-5 py-3 text-sm font-semibold text-intra-text-subtle transition hover:bg-intra-bg-app"
              >
                Ver wallet
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
