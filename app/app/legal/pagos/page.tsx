import Link from "next/link"
import {
  ArrowLeft,
  Clock3,
  FileText,
  ShieldCheck,
  Wallet,
} from "lucide-react"
import { AppNavbar } from "@/components/app-navbar"
import { getSafeInternalPath } from "@/lib/safe-next"
import { SHIPMENT_DECLARATION_TEXT } from "@/lib/shipments/security"

const sections = [
  {
    title: "Valor final y tarifa operativa",
    body:
      "El valor final mostrado al usuario incluye la tarifa operativa aplicable al uso de la plataforma, procesamiento del servicio y herramientas de protección operativa.",
  },
  {
    title: "Pago protegido",
    body:
      "El pago queda retenido temporalmente mientras se completa el proceso. El saldo del viajero podrá liberarse entre 24 y 48 horas después del cierre correcto, siempre que no existan disputas, bloqueos o revisiones activas.",
  },
  {
    title: "Disputas y revisiones",
    body:
      "El cliente podrá reportar una disputa dentro de las 24 horas siguientes a la entrega o finalización reportada del proceso. Las revisiones operativas pueden tomar hasta 72 horas hábiles.",
  },
  {
    title: "Reembolsos",
    body:
      "Algunos reembolsos pueden excluir costos operativos, financieros, tributarios o cargos de terceros que no sean reversados a INTRA por los proveedores involucrados.",
  },
  {
    title: "Retiros de wallet",
    body:
      "Los retiros aprobados normalmente se procesan entre 24 y 72 horas hábiles, dependiendo de validaciones operativas y disponibilidad bancaria.",
  },
]

type PaymentLegalPageProps = {
  searchParams?: Promise<{
    returnTo?: string
  }>
}

export default async function PaymentLegalPage({ searchParams }: PaymentLegalPageProps) {
  const params = await searchParams
  const checkoutHref = getSafeInternalPath(params?.returnTo, "/app/payments/checkout")

  return (
    <>
      <AppNavbar />

      <main className="intra-page-shell px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <Link
            href={checkoutHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-intra-text-success hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al checkout
          </Link>

          <section className="rounded-[24px] bg-intra-blue px-5 py-5 text-intra-card shadow-[var(--intra-shadow-hero)] sm:px-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-intra-card/20 bg-intra-card/10">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-intra-card/70">
                  Condiciones operativas
                </p>
                <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Pago protegido</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-intra-card/70">
                  Resumen de las condiciones aplicables al pago, liberación, disputas, reembolsos y retiros dentro de INTRA.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-3">
            {sections.map((section) => (
              <article
                key={section.title}
                className="rounded-[22px] border border-intra-border-soft bg-intra-card p-4 shadow-sm sm:p-5"
              >
                <h2 className="text-base font-bold text-intra-blue">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-intra-text-subtle">{section.body}</p>
              </article>
            ))}
          </section>

          <section className="rounded-[22px] border border-intra-success-border bg-intra-success-soft p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-intra-text-success" />
              <div>
                <h2 className="text-base font-bold text-intra-blue">Declaración responsable</h2>
                <p className="mt-2 text-sm leading-6 text-intra-text-subtle">{SHIPMENT_DECLARATION_TEXT}</p>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-intra-border-soft bg-intra-card p-4 shadow-sm">
              <Clock3 className="h-5 w-5 text-intra-text-success" />
              <p className="mt-3 text-sm font-semibold text-intra-blue">Tiempos visibles</p>
              <p className="mt-1 text-sm leading-6 text-intra-text-subtle">
                Disputa: 24h. Liberación: 24-48h. Revisión: hasta 72h hábiles.
              </p>
            </div>
            <div className="rounded-[22px] border border-intra-border-soft bg-intra-card p-4 shadow-sm">
              <Wallet className="h-5 w-5 text-intra-text-success" />
              <p className="mt-3 text-sm font-semibold text-intra-blue">Retiros</p>
              <p className="mt-1 text-sm leading-6 text-intra-text-subtle">
                Los retiros aprobados se procesan normalmente entre 24 y 72 horas hábiles.
              </p>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
