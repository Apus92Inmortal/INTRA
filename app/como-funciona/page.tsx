import type { Metadata } from "next"
import { MarketingHero, MarketingCard } from "@/components/marketing-hero"
import { MarketingSiteFooter } from "@/components/marketing-site-footer"
import { MarketingSiteHeader } from "@/components/marketing-site-header"

export const metadata: Metadata = {
  title: "Cómo funciona | INTRA",
  description:
    "Así funciona INTRA: publica tu envío, elige un viajero real y coordina la entrega directamente en el aeropuerto.",
}

const coreSteps = [
  {
    title: "Publica tu envío",
    body:
      "Indica qué necesitas enviar, si es un documento o un paquete pequeño, el aeropuerto de origen y el aeropuerto de destino.",
  },
  {
    title: "Elige un viajero",
    body:
      "INTRA te muestra viajeros reales que ya tienen programado un vuelo en tu misma ruta. Puedes ver quiénes están disponibles, revisar su información y elegir libremente a la persona que llevará tu envío. Tú decides con quién coordinar el servicio.",
  },
  {
    title: "Coordina y entrega en el aeropuerto",
    body:
      "Una vez confirmado el envío, ambas partes se comunican a través del chat de INTRA para acordar el punto exacto de entrega dentro del aeropuerto. El viajero recoge el envío antes del vuelo y, al llegar a destino, se coordina la entrega en el aeropuerto correspondiente.",
  },
]

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#f7f3eb] pb-8 text-[#0B2C4A]">
      <MarketingSiteHeader />

      <MarketingHero
        image="/landing/Como-Funciona.png"
        title={<>¿Cómo funciona INTRA?</>}
        subtitle={
          <>
            INTRA conecta personas que necesitan enviar documentos o paquetes
            pequeños con viajeros reales que ya van a volar y tienen espacio
            disponible en su equipaje.
            <br className="hidden md:block" />
            A diferencia de una empresa de mensajería tradicional, INTRA aprovecha
            viajes reales para ofrecer una opción más rápida, sencilla y flexible,
            coordinando todo directamente entre las partes dentro del aeropuerto.
          </>
        }
        minHeight="min-h-[520px] md:min-h-[85vh]"
      />

      <MarketingCard>
        <div className="grid gap-8 lg:grid-cols-3 lg:gap-10">
          {coreSteps.map((step) => (
            <div key={step.title} className="rounded-[24px] bg-[#f7f3eb] px-6 py-8">
              <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#0B2C4A]">
                {step.title}
              </h2>
              <p className="mt-5 text-sm leading-7 text-slate-600 md:text-base">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </MarketingCard>

      <MarketingCard>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          <div className="rounded-[24px] bg-[#f7f3eb] px-6 py-8">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#0B2C4A] md:text-4xl">
              ¿Dónde se realizan las entregas?
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600 md:text-base">
              <p>
                <strong>Entregas en aeropuertos</strong>
              </p>
              <p>
                Todas las entregas y recogidas se realizan dentro de los
                aeropuertos, en zonas públicas acordadas entre las partes.
              </p>
              <p>
                INTRA no realiza recogidas a domicilio ni entregas puerta a
                puerta. Este modelo permite mantener el servicio simple, rápido y
                enfocado en rutas aéreas. Esto reduce costos, tiempos y riesgos
                asociados a la mensajería tradicional.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#f7f3eb] px-6 py-8">
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#0B2C4A] md:text-4xl">
              ¿Qué se puede enviar?
            </h2>
            <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600 md:text-base">
              <p>
                <strong>¿Qué tipo de envíos se aceptan?</strong>
              </p>
              <p>
                INTRA está pensado para documentos y paquetes pequeños que puedan
                transportarse fácilmente en equipaje de mano o bodega.
              </p>
              <p>
                No se permiten artículos peligrosos, ni productos restringidos por
                normas aeroportuarias. El viajero siempre puede aceptar o rechazar
                un envío antes de confirmarlo.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-4xl text-center md:mt-14">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#0B2C4A] md:text-4xl">
            Un modelo simple y transparente
          </h2>
          <p className="mt-5 text-sm leading-7 text-slate-600 md:text-base">
            INTRA no es una empresa de mensajería ni un courier tradicional.
            Actuamos como una plataforma de conexión entre personas que envían y
            personas que viajan, facilitando la comunicación y la coordinación
            directa entre las partes.
          </p>
        </div>
      </MarketingCard>

      <MarketingSiteFooter />
    </main>
  )
}
