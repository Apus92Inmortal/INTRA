import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { MarketingHero, MarketingCard } from "@/components/marketing-hero"
import { MarketingSiteFooter } from "@/components/marketing-site-footer"
import { MarketingSiteHeader } from "@/components/marketing-site-header"

export const metadata: Metadata = {
  title: "Viaja y gana | INTRA",
  description:
    "Convierte el espacio libre en tu equipaje en ingresos adicionales con INTRA.",
}

const earnSteps = [
  { number: "01", title: "Publica tu ruta" },
  { number: "02", title: "Recibe solicitudes" },
  { number: "03", title: "Coordina y gana" },
]

const items = [
  "Documentos",
  "Paquetes pequeños",
  "Artículos permitidos por normas aeroportuarias",
]

const controls = [
  "Coordinación directa dentro del aeropuerto",
  "Entregas en zonas públicas",
  "Tú decides qué transportar",
]

export default function TravelAndEarnPage() {
  return (
    <main className="min-h-screen bg-[#f7f3eb] pb-8 text-[#0B2C4A]">
      <MarketingSiteHeader />

      <MarketingHero
        image="/landing/Viaja-y-Gana.png"
        title={<>Gana dinero cada vez que viajes</>}
        subtitle="Convierte el espacio libre en tu equipaje en ingresos adicionales."
        minHeight="min-h-[540px] md:min-h-[80vh]"
      >
        <div className="mt-8">
          <Link
            href="/app/trips/new"
            className="inline-flex rounded-full bg-[#2ECC71] px-8 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#26b861]"
          >
            Viajar y ganar
          </Link>
        </div>
      </MarketingHero>

      <MarketingCard>
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-5xl">
            ¿Cómo gano dinero?
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {earnSteps.map((step) => (
            <div key={step.number} className="rounded-[24px] bg-[#f7f3eb] px-6 py-8 text-center">
              <div className="text-sm font-semibold tracking-[0.35em] text-[#2ECC71]">
                {step.number}
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#0B2C4A]">
                {step.title}
              </h3>
            </div>
          ))}
        </div>
      </MarketingCard>

      <MarketingCard>
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[28px]">
            <Image
              src="/landing/Viajero.png"
              alt="Viajero usando INTRA"
              width={1200}
              height={900}
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              ¿Qué puedo transportar?
            </h2>

            <div className="mt-8 space-y-4">
              {items.map((item) => (
                <div key={item} className="flex items-center gap-3 text-base text-slate-700 md:text-lg">
                  <ArrowRight className="h-5 w-5 text-[#2ECC71]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <p className="mt-8 text-sm italic leading-7 text-slate-500 md:text-base">
              Siempre puedes aceptar o rechazar un envío antes de confirmarlo.
            </p>
          </div>
        </div>
      </MarketingCard>

      <MarketingCard>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
              Seguridad y control
            </h2>
          </div>
          <div className="space-y-4">
            {controls.map((item) => (
              <div key={item} className="flex items-center gap-3 text-base text-slate-700 md:text-lg">
                <ArrowRight className="h-5 w-5 text-[#2ECC71]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </MarketingCard>

      <section className="px-5 py-4 md:px-8 lg:px-12">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[28px] px-6 py-20 text-center text-white shadow-[0_16px_50px_rgba(11,44,74,0.12)] md:px-10">
          <Image
            src="/landing/Aeropuerto.png"
            alt="Avión en aeropuerto"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,26,44,0.55),rgba(8,26,44,0.45))]" />
          <div className="relative z-10 mx-auto max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-5xl">
              ¿Ya tienes un vuelo programado?
            </h2>
            <div className="mt-8">
              <Link
                href="/app/trips/new"
                className="inline-flex rounded-full bg-[#2ECC71] px-8 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#26b861]"
              >
                Publicar mi ruta ahora
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingSiteFooter />
    </main>
  )
}
