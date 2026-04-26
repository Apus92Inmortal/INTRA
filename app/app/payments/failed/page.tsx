import Link from "next/link"
import { AppNavbar } from "@/components/app-navbar"
import { formatCop, getPaymentResultLabel } from "@/lib/payments/wallet"

type PaymentFailedPageProps = {
  searchParams?: Promise<{
    amount?: string
    reference?: string
    paymentStatus?: string
    reason?: string
  }>
}

export default async function PaymentFailedPage({ searchParams }: PaymentFailedPageProps) {
  const params = await searchParams
  const amount = Number(params?.amount ?? "0")
  const reference = params?.reference ?? "Sin referencia"
  const paymentStatus = params?.paymentStatus ?? "failed"
  const reason = params?.reason ?? "El pago no pudo completarse."

  return (
    <>
      <AppNavbar />
      <main className="min-h-screen bg-[#EEF2F7] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-red-600">Pago no completado</p>
              <h1 className="mt-2 text-3xl font-bold text-[#0B2C4A]">No pudimos registrar el pago</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                Puedes revisar los datos e intentarlo de nuevo. No uses esta pantalla para reintentar con llaves reales
                hasta terminar la aprobación de Bold.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monto</p>
                <p className="mt-2 text-xl font-bold text-[#0B2C4A]">{formatCop(Number.isFinite(amount) ? amount : 0)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</p>
                <p className="mt-2 text-xl font-bold text-[#0B2C4A]">{getPaymentResultLabel(paymentStatus)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Referencia</p>
                <p className="mt-2 break-all text-sm font-semibold text-[#0B2C4A]">{reference}</p>
                <p className="mt-3 text-sm text-slate-500">Motivo: {reason}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/app/payments/checkout"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Volver al checkout
              </Link>
              <Link
                href="/app/market"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Ir al market
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
