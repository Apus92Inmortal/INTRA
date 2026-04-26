import Link from "next/link"
import { AppNavbar } from "@/components/app-navbar"
import { formatCop, getPaymentResultLabel } from "@/lib/payments/wallet"

type PaymentSuccessPageProps = {
  searchParams?: Promise<{
    amount?: string
    reference?: string
    shipmentId?: string
    paymentStatus?: string
    method?: string
  }>
}

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const params = await searchParams
  const amount = Number(params?.amount ?? "0")
  const reference = params?.reference ?? params?.shipmentId ?? "Pendiente"
  const paymentStatus = params?.paymentStatus ?? "held"
  const method = params?.method ?? "Pago seguro"

  return (
    <>
      <AppNavbar />
      <main className="min-h-screen bg-[#EEF2F7] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-[#A3E4BF] bg-white p-6 shadow-sm sm:p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EFFBF4] text-[#1e8c4e]">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#1e8c4e]">Pago seguro confirmado</p>
              <h1 className="mt-2 text-3xl font-bold text-[#0B2C4A]">Tu pago quedó registrado</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                El dinero quedó bajo retención temporal y se liberará al viajero cuando confirmes la entrega,
                o automáticamente al cumplirse la ventana configurada.
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
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Referencia</p>
                <p className="mt-2 break-all text-sm font-semibold text-[#0B2C4A]">{reference}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Método</p>
                <p className="mt-2 text-sm font-semibold text-[#0B2C4A]">{method}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/app/matches"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Ir a mis matches
              </Link>
              <Link
                href="/app/wallet"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
