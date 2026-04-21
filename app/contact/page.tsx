import type { Metadata } from "next"
import { MarketingContactForm } from "@/components/marketing-contact-form"
import { MarketingHero, MarketingCard } from "@/components/marketing-hero"
import { MarketingSiteFooter } from "@/components/marketing-site-footer"
import { MarketingSiteHeader } from "@/components/marketing-site-header"

export const metadata: Metadata = {
  title: "Contáctanos | INTRA",
  description:
    "Habla con soporte INTRA si tienes dudas sobre cómo enviar un paquete o publicar tu ruta.",
}

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#f7f3eb] pb-8 text-[#0B2C4A]">
      <MarketingSiteHeader />

      <MarketingHero
        image="/landing/Contacto.png"
        title={<>¿Tienes dudas sobre INTRA?</>}
        subtitle="Nuestro equipo de soporte está listo para ayudarte."
        minHeight="min-h-[540px] md:min-h-[85vh]"
      />

      <MarketingCard>
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-8 px-1 md:px-3">
            <div>
              <h2 className="text-4xl font-semibold tracking-[-0.03em] text-[#0B2C4A] md:text-5xl">
                Soporte INTRA
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600 md:text-base">
                Si tienes preguntas sobre cómo enviar un paquete o publicar tu
                ruta, escríbenos.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2ECC71]">
                  WhatsApp
                </div>
                <a
                  href="https://wa.me/573012319742"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-lg font-medium text-[#0B2C4A] transition hover:text-[#2ECC71]"
                >
                  +57 301 231 9742
                </a>
              </div>

              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2ECC71]">
                  Email
                </div>
                <a
                  href="mailto:soporte@intra.com.co"
                  className="mt-2 block text-lg font-medium text-[#0B2C4A] transition hover:text-[#2ECC71]"
                >
                  soporte@intra.com.co
                </a>
              </div>

              <p className="text-sm italic leading-7 text-slate-500 md:text-base">
                Tiempo estimado de respuesta: 24 horas
              </p>
            </div>
          </div>

          <MarketingContactForm />
        </div>

        <div className="mx-auto mt-10 max-w-5xl text-center text-sm italic leading-7 text-slate-500 md:mt-14 md:text-base">
          INTRA es una plataforma de conexión entre usuarios. No realizamos envíos
          directamente ni prestamos servicios de mensajería tradicional.
        </div>
      </MarketingCard>

      <MarketingSiteFooter />
    </main>
  )
}
