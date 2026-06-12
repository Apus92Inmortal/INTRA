import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { AppNavbar } from "@/components/app-navbar"
import { formatCop } from "@/lib/payments/wallet"
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

function buildTrackingCode(reference: string | null | undefined, paymentId: string | null | undefined) {
  const source = reference?.trim() || paymentId?.trim() || ""
  const compact = source.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()

  if (!compact) {
    return "INTRA-PENDIENTE"
  }

  return `INTRA-${compact.slice(-6)}`
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
  const method =
    payment?.payment_method === "simulated"
      ? "Pago seguro"
      : payment?.payment_method === "wompi_widget"
      ? "Wompi"
      : payment?.payment_method ?? "Pago seguro"
  const isConfirmed = paymentStatus === "held" || paymentStatus === "released"
  const eyebrow = isConfirmed ? "PAGO CONFIRMADO" : "PAGO EN VALIDACIÓN"
  const title = isConfirmed ? "Tu envío quedó confirmado" : "Estamos confirmando tu pago"
  const description = isConfirmed
    ? "Ya puedes volver al inicio y seguir el estado de tus envíos."
    : "Te mostraremos la actualización cuando el estado esté listo."
  const visibleStatus = isConfirmed ? "Confirmado" : "En validación"
  const trackingCode = buildTrackingCode(payment?.external_reference, paymentId)

  return (
    <>
      <AppNavbar />
      <main className="intra-page-shell px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl items-center">
          <section className="w-full rounded-[24px] border border-intra-success-border bg-intra-card p-5 shadow-sm sm:p-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-intra-success-soft text-intra-text-success">
              <CheckCircle2 className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
            </div>

            <div className="mt-5 text-center">
              <p className="intra-badge-text text-intra-text-success">{eyebrow}</p>
              <h1 className="mt-2 intra-h1 text-intra-blue">{title}</h1>
              <p className="mx-auto mt-3 max-w-xl intra-body text-intra-text-muted">
                {description}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex min-h-20 flex-col gap-1.5 rounded-2xl bg-intra-bg-app p-3.5 sm:p-4">
                <p className="intra-badge-text uppercase text-intra-text-muted">Monto pagado</p>
                <p className="intra-body-strong text-intra-blue">{formatCop(Number.isFinite(amount) ? amount : 0)}</p>
              </div>
              <div className="flex min-h-20 flex-col gap-1.5 rounded-2xl bg-intra-bg-app p-3.5 sm:p-4">
                <p className="intra-badge-text uppercase text-intra-text-muted">Estado del envío</p>
                <p className="intra-body-strong text-intra-blue">{visibleStatus}</p>
              </div>
              <div className="flex min-h-20 flex-col gap-1.5 rounded-2xl bg-intra-bg-app p-3.5 sm:p-4">
                <p className="intra-badge-text uppercase text-intra-text-muted">Código de rastreo</p>
                <p className="intra-body-strong text-intra-blue">{trackingCode}</p>
              </div>
              <div className="flex min-h-20 flex-col gap-1.5 rounded-2xl bg-intra-bg-app p-3.5 sm:p-4">
                <p className="intra-badge-text uppercase text-intra-text-muted">Método</p>
                <p className="intra-body-strong text-intra-blue">{method}</p>
              </div>
            </div>

            {!paymentId || !payment ? (
              <div className="mt-5 rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-4 py-3 intra-body text-intra-warning-text">
                No pudimos cargar el detalle completo de este pago.
              </div>
            ) : null}

            <div className="mt-7 flex justify-center">
              <Link
                href="/app"
                className="intra-btn intra-btn-primary min-h-12 w-full sm:w-56"
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
