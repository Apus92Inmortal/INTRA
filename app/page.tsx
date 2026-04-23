import Image from "next/image";
import Link from "next/link";

const stats = [
  { value: "12", label: "Ciudades" },
  { value: "132", label: "Rutas activas" },
  { value: "$14K", label: "Desde COP" },
  { value: "24-48h", label: "Entrega" },
] as const;

const steps = [
  {
    number: "01",
    title: "Publica tu envío",
    description:
      "Indica qué necesitas enviar, la ciudad de origen y destino. El precio se calcula automáticamente.",
  },
  {
    number: "02",
    title: "Elige un viajero",
    description:
      "Revisa viajeros disponibles en tu ruta, revisa su perfil y acepta al que más te convenga.",
  },
  {
    number: "03",
    title: "Coordina y recibe",
    description:
      "Chat directo con el viajero, entrega en el punto acordado y confirma la recepción. El pago se libera automáticamente.",
  },
] as const;

const pricing = [
  {
    name: "📍 Corta distancia",
    price: "14.000",
    description: "Misma región",
    examples: [
      "Bogotá → Villavicencio",
      "Medellín → Pereira",
      "Cali → Buenaventura",
    ],
    highlighted: false,
  },
  {
    name: "🏙️ Media distancia",
    price: "18.000",
    description: "Entre regiones",
    examples: [
      "Bogotá → Medellín",
      "Bogotá → Cartagena",
      "Cali → Bogotá",
    ],
    highlighted: true,
  },
  {
    name: "✈️ Larga distancia",
    price: "24.000",
    description: "Costa a costa",
    examples: [
      "Bogotá → San Andrés",
      "Bogotá → Leticia",
      "Medellín → Cartagena",
    ],
    highlighted: false,
  },
] as const;

const travelerBenefits = [
  {
    title: "💰 Gana por cada entrega",
    description:
      "Recibe el pago completo por llevar paquetes que van en tu misma ruta. Sin esfuerzo adicional.",
  },
  {
    title: "🛡️ Pago seguro garantizado",
    description:
      "El dinero se retiene hasta que confirmes la entrega. Sin riesgo de impago.",
  },
  {
    title: "✅ Tú eliges qué llevar",
    description:
      "Aceptas solo los envíos que te acomoden. Tú controlas tu capacidad y tu tiempo.",
  },
  {
    title: "⭐ Construye tu reputación",
    description:
      "Cada entrega exitosa mejora tu perfil. Más calificaciones = más envíos = más ingresos.",
  },
] as const;

const testimonials = [
  {
    initials: "LC",
    name: "Laura C.",
    role: "Cliente · Bogotá → Medellín",
    text: "Necesitaba enviar unos documentos urgentes a Medellín. En menos de 24 horas los tenía. Increíble servicio.",
  },
  {
    initials: "AM",
    name: "Andrés M.",
    role: "Viajero · Bogotá → Cartagena",
    text: "Viajo cada semana a Cartagena por trabajo. Ahora gano un extra llevando paquetes. No podía ser más fácil.",
  },
  {
    initials: "CR",
    name: "Carolina R.",
    role: "Cliente · Cali → Bogotá",
    text: "Mucho más barato que Servientrega y más rápido. El chat directo con el viajero te da mucha tranquilidad.",
  },
] as const;

const faqs = [
  {
    question: "¿Qué tipo de paquetes puedo enviar?",
    answer:
      "Documentos, paquetes pequeños y medianos (hasta 10 kg). No se permiten artículos prohibidos por aviación civil (líquidos, sustancias peligrosas, etc.).",
  },
  {
    question: "¿Qué pasa si mi paquete se pierde o daña?",
    answer:
      "El pago se retiene de forma segura hasta que confirmas la entrega. Si hay algún problema, puedes reportarlo a través de la app y nuestro equipo lo revisa. Estamos trabajando en seguro adicional para mayor tranquilidad.",
  },
  {
    question: "¿Cómo funciona el pago?",
    answer:
      "El cliente paga al publicar el envío. El dinero se retiene de forma segura hasta que el receptor confirma la entrega. Entonces se libera al viajero. Sin contacto directo con datos de tarjeta.",
  },
  {
    question: "¿Puedo elegir quién lleva mi paquete?",
    answer:
      "Sí. Puedes ver perfiles de viajeros, sus calificaciones y reviews. Tú decides a quién aceptar. Si nadie te conviene, puedes cancelar sin costo.",
  },
  {
    question: "¿Cuánto puedo ganar como viajero?",
    answer:
      "Desde $14.000 COP por envío corto, $18.000 por medio y $24.000 por largo. Si viajas con espacio libre y llevas varios paquetes, los ingresos se acumulan.",
  },
  {
    question: "¿En qué ciudades están disponibles?",
    answer:
      "Bogotá, Medellín, Cartagena, Bucaramanga, Cali, Barranquilla, San Andrés, Pereira, Cúcuta, Leticia, Santa Marta y Villavicencio. Cubrimos las 132 combinaciones de rutas entre estas ciudades.",
  },
] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#2ECC71]/25 bg-[#2ECC71]/10 px-4 py-1 text-sm font-semibold text-[#17834a]">
      {children}
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="bg-[#f5f8fb] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/atlas-reference/logo-atlas.png"
              alt="INTRA"
              width={180}
              height={60}
              priority
              className="h-auto w-[140px] sm:w-[168px]"
            />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
            <a className="transition hover:text-slate-950" href="#inicio">
              Inicio
            </a>
            <a className="transition hover:text-slate-950" href="#como-funciona">
              Cómo funciona
            </a>
            <a className="transition hover:text-slate-950" href="#precios">
              Precios
            </a>
            <a className="transition hover:text-slate-950" href="#viaja-y-gana">
              Viaja y gana
            </a>
            <a className="transition hover:text-slate-950" href="#faq">
              FAQ
            </a>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/login"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#0B2C4A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#133e64]"
            >
              Registrarse gratis
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="inicio" className="px-4 pb-6 pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-slate-950 shadow-[0_28px_80px_rgba(11,44,74,0.18)]">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/atlas-reference/hero-atlas.png')" }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(7,17,33,0.92)_18%,rgba(11,44,74,0.78)_48%,rgba(15,23,42,0.48)_100%)]" />
              <div className="relative px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
                <div className="max-w-3xl">
                  <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
                    ✈️ 12 ciudades colombianas cubiertas
                  </div>
                  <h1 className="mt-6 max-w-2xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                    Envía documentos y paquetes entre ciudades, {" "}
                    <span className="text-[#84f5ae]">hoy mismo</span>
                  </h1>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
                    Viajeros reales los llevan por ti entre aeropuertos. Desde {" "}
                    <strong className="text-white">$14.000 COP</strong>.
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/app/shipments/new"
                      className="inline-flex items-center justify-center rounded-full bg-[#2ECC71] px-6 py-3.5 text-base font-semibold text-[#08341d] transition hover:bg-[#57d98e]"
                    >
                      Publicar envío
                    </Link>
                    <a
                      href="#como-funciona"
                      className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
                    >
                      Cómo funciona
                    </a>
                  </div>

                  <div className="mt-8 inline-flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-white backdrop-blur-sm sm:flex-row sm:items-center sm:gap-4">
                    <span className="text-lg tracking-[0.3em] text-[#ffd76a]">★★★★★</span>
                    <span className="text-sm font-medium text-white/90 sm:text-base">
                      +120 viajeros activos · 132 rutas · <strong>4.9/5</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-8 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto grid max-w-6xl gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:p-6">
            {stats.map((item, index) => (
              <div
                key={item.label}
                className={`flex flex-col items-center justify-center rounded-2xl px-6 py-5 text-center ${
                  index < stats.length - 1 ? "lg:border-r lg:border-slate-200" : ""
                }`}
              >
                <span className="text-3xl font-black text-[#0B2C4A]">{item.value}</span>
                <span className="mt-1 text-sm font-medium text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-6xl rounded-[32px] border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-8 lg:px-12 lg:py-14">
            <div className="text-center">
              <SectionLabel>En 3 pasos</SectionLabel>
              <h2 className="mt-4 text-3xl font-black text-[#0B2C4A] sm:text-4xl">
                ¿Cómo funciona?
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                Conectamos personas que necesitan enviar algo con viajeros que ya van a volar y tienen espacio disponible en su equipaje. {" "}
                <strong className="text-slate-800">
                  Sin intermediarios, sin bodegas, sin esperas.
                </strong>
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-7 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="text-sm font-black tracking-[0.28em] text-[#2ECC71]">
                    {step.number}
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-[#0B2C4A]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="precios" className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-6xl rounded-[32px] border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-8 lg:px-12 lg:py-14">
            <div className="text-center">
              <SectionLabel>Transparente</SectionLabel>
              <h2 className="mt-4 text-3xl font-black text-[#0B2C4A] sm:text-4xl">
                Precios claros por ruta
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                Sin sorpresas, sin cobros ocultos. Sabes cuánto cuesta antes de publicar tu envío.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {pricing.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative rounded-[28px] border p-7 transition hover:-translate-y-1 hover:shadow-xl ${
                    plan.highlighted
                      ? "border-[#2ECC71] bg-[#0B2C4A] text-white"
                      : "border-slate-200 bg-slate-50 text-slate-900"
                  }`}
                >
                  {plan.highlighted ? (
                    <span className="absolute right-6 top-6 rounded-full bg-[#2ECC71] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#08341d]">
                      Más popular
                    </span>
                  ) : null}
                  <div
                    className={`text-sm font-semibold ${
                      plan.highlighted ? "text-[#9df6bf]" : "text-slate-500"
                    }`}
                  >
                    {plan.name}
                  </div>
                  <div className="mt-6 flex items-end gap-1">
                    <span className="text-2xl font-bold">$</span>
                    <span className="text-5xl font-black tracking-tight">{plan.price}</span>
                  </div>
                  <div
                    className={`mt-1 text-sm font-semibold uppercase tracking-[0.2em] ${
                      plan.highlighted ? "text-white/70" : "text-slate-500"
                    }`}
                  >
                    COP
                  </div>
                  <p
                    className={`mt-4 text-base ${
                      plan.highlighted ? "text-white/85" : "text-slate-600"
                    }`}
                  >
                    {plan.description}
                  </p>
                  <div className="mt-6 flex flex-col gap-3">
                    {plan.examples.map((example) => (
                      <span
                        key={example}
                        className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                          plan.highlighted
                            ? "bg-white/10 text-white"
                            : "bg-white text-slate-700"
                        }`}
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                  <Link
                    href="/app/shipments/new"
                    className={`mt-7 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition ${
                      plan.highlighted
                        ? "bg-[#2ECC71] text-[#08341d] hover:bg-[#57d98e]"
                        : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    Enviar ahora
                  </Link>
                </article>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-slate-500 sm:text-base">
              Hasta 60% más barato que envíos tradicionales. El pago se retiene de forma segura hasta que confirmes la entrega.
            </p>
          </div>
        </section>

        <section id="viaja-y-gana" className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-6xl rounded-[32px] border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-8 lg:px-12 lg:py-14">
            <div className="text-center">
              <SectionLabel>Para viajeros</SectionLabel>
              <h2 className="mt-4 text-3xl font-black text-[#0B2C4A] sm:text-4xl">
                Viaja y gana dinero extra
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                ¿Vas a viajar con espacio libre en tu equipaje? Monetiza tu viaje llevando paquetes que ya van en tu dirección.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {travelerBenefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-7 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <h3 className="text-2xl font-bold text-[#0B2C4A]">{benefit.title}</h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    {benefit.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Link
                href="/app/trips/new"
                className="inline-flex items-center justify-center rounded-full bg-[#2ECC71] px-6 py-3.5 text-base font-semibold text-[#08341d] transition hover:bg-[#57d98e]"
              >
                Publicar mi viaje
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-6xl rounded-[32px] border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-8 lg:px-12 lg:py-14">
            <div className="text-center">
              <SectionLabel>Lo que dicen</SectionLabel>
              <h2 className="mt-4 text-3xl font-black text-[#0B2C4A] sm:text-4xl">
                Historias reales
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                Miles de envíos ya se han completado con éxito en INTRA.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <article
                  key={testimonial.name}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-7 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="text-lg tracking-[0.3em] text-[#f0c24d]">★★★★★</div>
                  <p className="mt-4 text-base leading-7 text-slate-700">
                    “{testimonial.text}”
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B2C4A] text-sm font-bold text-white">
                      {testimonial.initials}
                    </div>
                    <div>
                      <div className="font-semibold text-[#0B2C4A]">{testimonial.name}</div>
                      <div className="text-sm text-slate-500">{testimonial.role}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-6xl rounded-[32px] border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-8 lg:px-12 lg:py-14">
            <div className="text-center">
              <SectionLabel>Preguntas frecuentes</SectionLabel>
              <h2 className="mt-4 text-3xl font-black text-[#0B2C4A] sm:text-4xl">
                Resolvemos tus dudas
              </h2>
            </div>

            <div className="landing-faq mx-auto mt-10 max-w-4xl space-y-4">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 px-6 py-5 transition open:border-[#2ECC71]/50 open:bg-white"
                >
                  <summary className="faq-summary flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg font-semibold text-[#0B2C4A]">
                    <span>{faq.question}</span>
                    <span className="text-2xl font-light text-[#2ECC71] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pt-4 text-base leading-7 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-slate-950 px-6 py-12 shadow-[0_28px_80px_rgba(11,44,74,0.16)] sm:px-10 lg:px-14 lg:py-16">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/atlas-reference/hero-atlas.png')" }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(7,17,33,0.9)_18%,rgba(11,44,74,0.76)_48%,rgba(15,23,42,0.5)_100%)]" />
              <div className="relative text-center">
                <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Tu próximo envío no tiene que ser complicado
                </h2>
                <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-white/85 sm:text-lg">
                  Regístrate gratis, publica en 2 minutos y recibe matchs de viajeros reales hoy mismo.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-full bg-[#2ECC71] px-6 py-3.5 text-base font-semibold text-[#08341d] transition hover:bg-[#57d98e]"
                  >
                    Comenzar gratis
                  </Link>
                  <Link
                    href="/app/trips/new"
                    className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
                  >
                    Soy viajero
                  </Link>
                </div>
                <p className="mt-5 text-sm font-medium text-white/80 sm:text-base">
                  Sin tarjeta de crédito · Sin compromiso · 12 ciudades cubiertas
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-8 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr]">
            <div>
              <Image
                src="/atlas-reference/logo-atlas.png"
                alt="INTRA"
                width={180}
                height={60}
                className="h-auto w-[160px]"
              />
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
                Plataforma que conecta personas que necesitan enviar documentos o paquetes con viajeros reales entre ciudades colombianas.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#0B2C4A]">Navegación</h3>
              <div className="mt-4 flex flex-col gap-3 text-sm font-medium text-slate-600">
                <a href="#inicio" className="transition hover:text-slate-950">
                  Inicio
                </a>
                <a href="#como-funciona" className="transition hover:text-slate-950">
                  Cómo funciona
                </a>
                <a href="#precios" className="transition hover:text-slate-950">
                  Precios
                </a>
                <a href="#faq" className="transition hover:text-slate-950">
                  Preguntas frecuentes
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#0B2C4A]">Accesos</h3>
              <div className="mt-4 flex flex-col gap-3 text-sm font-medium text-slate-600">
                <Link href="/login" className="transition hover:text-slate-950">
                  Iniciar sesión
                </Link>
                <Link href="/register" className="transition hover:text-slate-950">
                  Crear cuenta
                </Link>
                <Link href="/drafts/joy-original" className="transition hover:text-slate-950">
                  Borrador anterior de Joy
                </Link>
                <a
                  href="https://intra-landing-atlas.vercel.app"
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-slate-950"
                >
                  Referencia Atlas
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 INTRA. Todos los derechos reservados.</span>
            <span>Hecho con ❤️ en Colombia</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
