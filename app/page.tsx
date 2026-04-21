import type { Metadata } from "next"
import { MarketingHero, MarketingCard } from "@/components/marketing-hero"
import { MarketingSiteFooter } from "@/components/marketing-site-footer"
import { MarketingSiteHeader } from "@/components/marketing-site-header"

export const metadata: Metadata = {
  title: "INTRA | Envía documentos y paquetes entre ciudades",
  description:
    "Conecta con viajeros reales y envía documentos o paquetes pequeños entre aeropuertos de manera rápida y sencilla.",
}

const steps = [
  {
    number: "01",
    title: "Publica tu envío",
    description:
      "Indica qué necesitas enviar y los aeropuertos de origen y destino.",
  },
  {
    number: "02",
    title: "Elige un viajero",
    description:
      "Revisa viajeros disponibles en tu ruta y elige el que más te convenga.",
  },
  {
    number: "03",
    title: "Entrega y recibe en el aeropuerto",
    description:
      "Coordina por chat, entrega en el aeropuerto de origen y recibe en el de destino.",
  },
  {
    number: "04",
    title: "Rápido y sencillo",
    description:
      "Sin intermediarios, sin bodegas, sin esperas innecesarias.",
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f3eb] pb-8 text-[#0B2C4A]">
      <MarketingSiteHeader />

      <MarketingHero
        image="/landing/ChatGPT-Image-1-feb-2026-12_09_59-a.m.png"
        title={
          <>
            Envía documentos y paquetes
            <br className="hidden md:block" /> entre ciudades, hoy mismo
          </>
        }
        subtitle="Viajeros reales los llevan por ti entre aeropuertos"
        minHeight="min-h-[560px] md:min-h-[80vh]"
      />

      <MarketingCard>
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-5xl">
            ¿Cómo funciona?
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600 md:text-lg md:leading-8">
            Conectamos personas que necesitan enviar algo con viajeros que ya van
            a volar y tienen espacio disponible en su equipaje.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:mt-12 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-[24px] bg-[#f7f3eb] px-6 py-8 text-center"
            >
              <div className="text-sm font-semibold tracking-[0.35em] text-[#2ECC71]">
                {step.number}
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#0B2C4A]">
                {step.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </MarketingCard>

      <MarketingSiteFooter />
    </main>
  )
}
