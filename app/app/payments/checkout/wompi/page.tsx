import Link from "next/link"
import { headers } from "next/headers"
import { AppNavbar } from "@/components/app-navbar"
import { createClient } from "@/lib/supabase/server"
import { formatCop, getPaymentResultLabel } from "@/lib/payments/wallet"
import {
  buildWompiIntegritySignature,
  getWompiPublicKey,
  isWompiSandbox,
  WOMPI_WIDGET_URL,
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
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
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
        .select("id, amount, status, external_reference, currency")
        .eq("id", paymentId)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null }

  const payment = (paymentRes.data ?? null) as PaymentRow | null
  const amount = Number(payment?.amount ?? 0)
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000"
  const proto = headerStore.get("x-forwarded-proto") ?? "https"
  const origin = buildOrigin(host, proto)

  const canRenderWidget =
    payment &&
    payment.external_reference &&
    Number.isFinite(amount) &&
    amount > 0 &&
    (payment.status === "pending" || payment.status === "processing")

  const amountInCents = canRenderWidget ? wompiAmountToCents(amount) : 0
  const redirectUrl = canRenderWidget
    ? `${origin}/app/payments/checkout/return?paymentId=${payment.id}`
    : ""
  const integritySignature = canRenderWidget
    ? buildWompiIntegritySignature({
        reference: payment.external_reference!,
        amountInCents,
        currency: payment.currency ?? "COP",
      })
    : ""

  const widgetMarkup = canRenderWidget
    ? `<form>
  <script
    src="${escapeHtmlAttribute(WOMPI_WIDGET_URL)}"
    data-render="button"
    data-public-key="${escapeHtmlAttribute(getWompiPublicKey())}"
    data-currency="${escapeHtmlAttribute(payment.currency ?? "COP")}"
    data-amount-in-cents="${escapeHtmlAttribute(String(amountInCents))}"
    data-reference="${escapeHtmlAttribute(payment.external_reference!)}"
    data-signature:integrity="${escapeHtmlAttribute(integritySignature)}"
    data-redirect-url="${escapeHtmlAttribute(redirectUrl)}"
  ></script>
</form>`
    : null

  return (
    <>
      <AppNavbar />
      <main className="min-h-screen bg-[#EEF2F7] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#0B2C4A]">
                Checkout Wompi
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#0B2C4A]">
                Completa tu pago seguro
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                Vas a pagar con Wompi y el dinero quedará en retención temporal hasta confirmar la entrega.
              </p>
            </div>

            {isWompiSandbox() ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Estás usando Wompi Sandbox. Este flujo es de prueba.
              </div>
            ) : null}

            {payment ? (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monto</p>
                  <p className="mt-2 text-xl font-bold text-[#0B2C4A]">{formatCop(amount)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</p>
                  <p className="mt-2 text-xl font-bold text-[#0B2C4A]">{getPaymentResultLabel(payment.status)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Referencia</p>
                  <p className="mt-2 break-all text-sm font-semibold text-[#0B2C4A]">
                    {payment.external_reference ?? "Sin referencia"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                No encontramos un pago válido para abrir Wompi.
              </div>
            )}

            {widgetMarkup ? (
              <div className="mt-8 flex justify-center" dangerouslySetInnerHTML={{ __html: widgetMarkup }} />
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/app/payments/checkout"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Volver al checkout
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
