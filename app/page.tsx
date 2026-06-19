import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: {
    absolute: "INTRA — Envía paquetes con viajeros reales",
  },
  description:
    "Conecta con viajeros que ya van a tu destino. Envía documentos y paquetes entre ciudades desde $20.000 COP. Rápido, seguro y sin intermediarios.",
  openGraph: {
    title: "INTRA — Envía paquetes con viajeros reales",
    description:
      "Envía documentos y paquetes entre ciudades colombianas. Viajeros reales, precios desde $20.000 COP.",
    type: "website",
    url: "https://intra-chi.vercel.app",
    images: [
      {
        url: "/assets/ChatGPT-Image-1-feb-2026-12_09_59-a.m.png",
        width: 1536,
        height: 1024,
        alt: "INTRA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "INTRA — Envía paquetes con viajeros reales",
    description:
      "Envía documentos y paquetes entre ciudades colombianas. Viajeros reales, precios desde $20.000 COP.",
    images: ["/assets/ChatGPT-Image-1-feb-2026-12_09_59-a.m.png"],
  },
};

const atlasLandingHtml = String.raw`
<header class="header">
  <div class="wrap nav">
    <div class="nav-left">
      <a href="/"><img class="logo" src="/assets/cropped-Logo2sinfondo-1.png" alt="INTRA"></a>
    </div>
    <div class="nav-center">
      <nav class="navlinks">
        <a class="active intra-body-strong" href="#inicio">Inicio</a>
        <a class="intra-body-strong" href="#como-funciona">Cómo funciona</a>
        <a class="intra-body-strong" href="#precios">Precios</a>
        <a class="intra-body-strong" href="#viaja-y-gana">Viaja y gana</a>
        <a class="intra-body-strong nav-faq-link" href="#faq">FAQ</a>
      </nav>
    </div>
    <div class="nav-right">
      <a class="nav-cta nav-cta-outline intra-body-strong" href="https://intra-chi.vercel.app/login">Iniciar sesión</a>
      <a class="nav-cta nav-cta-solid intra-body-strong" href="https://intra-chi.vercel.app/register">Registrarse</a>
    </div>
  </div>
</header>

<section id="inicio" class="hero">
  <div class="wrap hero-card" style="background-image:url(/assets/ChatGPT-Image-1-feb-2026-12_09_59-a.m.png)">
    <div class="overlay"></div>
    <div class="hero-content">
      <div class="hero-badge intra-badge-text">✈️ 12 ciudades colombianas cubiertas</div>
      <h1 class="intra-title">Envía documentos y paquetes entre ciudades, <span class="text-green">hoy mismo</span></h1>
      <p class="intra-subtitle">Viajeros reales los llevan por ti entre aeropuertos. Desde <strong>$20.000 COP</strong>.</p>
      <div class="btn-row">
        <a class="btn btn-primary intra-badge-text" href="https://intra-chi.vercel.app/shipments/new">Publicar envío</a>
        <a class="btn btn-secondary intra-badge-text" href="#como-funciona">Cómo funciona</a>
      </div>
      <div class="hero-proof">
        <div class="proof-stars intra-caption">★★★★★</div>
        <div class="proof-text intra-caption">+120 viajeros activos · 132 rutas · <strong>4.9/5</strong></div>
      </div>
    </div>
  </div>
</section>

<section class="proof-bar">
  <div class="wrap proof-bar-inner">
    <div class="proof-item">
      <div class="proof-num intra-metric">12</div>
      <div class="proof-label intra-badge-text">Ciudades</div>
    </div>
    <div class="proof-divider"></div>
    <div class="proof-item">
      <div class="proof-num intra-metric">132</div>
      <div class="proof-label intra-badge-text">Rutas activas</div>
    </div>
    <div class="proof-divider"></div>
    <div class="proof-item">
      <div class="proof-num intra-metric">$20K</div>
      <div class="proof-label intra-badge-text">Desde COP</div>
    </div>
    <div class="proof-divider"></div>
    <div class="proof-item">
      <div class="proof-num intra-metric">24-48h</div>
      <div class="proof-label intra-badge-text">Entrega</div>
    </div>
  </div>
</section>

<section id="como-funciona" class="section">
  <div class="wrap card center">
    <div class="section-label intra-badge-text">En 3 pasos</div>
    <h2 class="intra-title">¿Cómo funciona?</h2>
    <p class="lead intra-body">Conectamos personas que necesitan enviar algo con viajeros que ya van a volar y tienen espacio disponible en su equipaje. <strong>Sin intermediarios, sin bodegas, sin esperas.</strong></p>
    <div class="grid-3">
      <div class="mini">
        <div class="num intra-badge-text">01</div>
        <h3 class="intra-subtitle">Publica tu envío</h3>
        <p class="intra-body">Indica qué necesitas enviar, la ciudad de origen y destino. El precio se calcula automáticamente.</p>
      </div>
      <div class="mini">
        <div class="num intra-badge-text">02</div>
        <h3 class="intra-subtitle">Elige un viajero</h3>
        <p class="intra-body">Revisa viajeros disponibles en tu ruta, revisa su perfil y acepta al que más te convenga.</p>
      </div>
      <div class="mini">
        <div class="num intra-badge-text">03</div>
        <h3 class="intra-subtitle">Coordina y recibe</h3>
        <p class="intra-body">Chat directo con el viajero, entrega en el punto acordado y confirma la recepción. El pago se libera automáticamente.</p>
      </div>
    </div>
  </div>
</section>

<section id="precios" class="section">
  <div class="wrap card center">
    <div class="section-label intra-badge-text">Transparente</div>
    <h2 class="intra-title">Precios claros por ruta</h2>
    <p class="lead intra-body">Sin sorpresas, sin cobros ocultos. Sabes cuánto cuesta antes de publicar tu envío.</p>
    <div class="grid-3">
      <div class="price-card">
        <div class="price-badge intra-body-strong">📍 Corta distancia</div>
        <div class="price-tag"><span class="price-currency intra-subtitle">$</span><span class="price-amount intra-metric">20.000</span></div>
        <div class="price-unit intra-caption-strong">COP</div>
        <p class="price-desc intra-caption">Misma región</p>
        <div class="price-examples intra-caption">
          <span>Bogotá → Villavicencio</span>
          <span>Medellín → Pereira</span>
          <span>Cartagena → Santa Marta</span>
        </div>
        <a class="btn btn-outline intra-badge-text" href="https://intra-chi.vercel.app/shipments/new">Enviar ahora</a>
      </div>
      <div class="price-card price-popular">
        <div class="popular-tag intra-badge-text">⭐ Más popular</div>
        <div class="price-badge intra-body-strong">🏙️ Media distancia</div>
        <div class="price-tag"><span class="price-currency intra-subtitle">$</span><span class="price-amount intra-metric">25.000</span></div>
        <div class="price-unit intra-caption-strong">COP</div>
        <p class="price-desc intra-caption">Entre regiones</p>
        <div class="price-examples intra-caption">
          <span>Bogotá → Medellín</span>
          <span>Bogotá → Cartagena</span>
          <span>Cali → Bogotá</span>
        </div>
        <a class="btn btn-primary intra-badge-text" href="https://intra-chi.vercel.app/shipments/new">Enviar ahora</a>
      </div>
      <div class="price-card">
        <div class="price-badge intra-body-strong">✈️ Larga distancia</div>
        <div class="price-tag"><span class="price-currency intra-subtitle">$</span><span class="price-amount intra-metric">35.000</span></div>
        <div class="price-unit intra-caption-strong">COP</div>
        <p class="price-desc intra-caption">Costa a costa</p>
        <div class="price-examples intra-caption">
          <span>Bogotá → San Andrés</span>
          <span>Bogotá → Leticia</span>
          <span>Cali → Santa Marta</span>
        </div>
        <a class="btn btn-outline intra-badge-text" href="https://intra-chi.vercel.app/shipments/new">Enviar ahora</a>
      </div>
    </div>
    <p class="price-note intra-body">Hasta 60% más barato que envíos tradicionales. El pago se retiene de forma segura hasta que confirmes la entrega.</p>
  </div>
</section>

<section id="viaja-y-gana" class="section">
  <div class="wrap card center">
    <div class="section-label intra-badge-text">Para viajeros</div>
    <h2 class="intra-title">Viaja y gana dinero extra</h2>
    <p class="lead intra-body">¿Vas a viajar con espacio libre en tu equipaje? Monetiza tu viaje llevando paquetes que ya van en tu dirección.</p>
    <div class="grid-2 traveler-grid">
      <div class="highlight-card">
        <h3 class="intra-subtitle">💰 Gana por cada entrega</h3>
        <p class="intra-body">Recibe el pago completo por llevar paquetes que van en tu misma ruta. Sin esfuerzo adicional.</p>
      </div>
      <div class="highlight-card">
        <h3 class="intra-subtitle">🛡️ Pago seguro garantizado</h3>
        <p class="intra-body">El dinero se retiene hasta que confirmes la entrega. Sin riesgo de impago.</p>
      </div>
      <div class="highlight-card">
        <h3 class="intra-subtitle">✅ Tú eliges qué llevar</h3>
        <p class="intra-body">Aceptas solo los envíos que te acomoden. Tú controlas tu capacidad y tu tiempo.</p>
      </div>
      <div class="highlight-card">
        <h3 class="intra-subtitle">⭐ Construye tu reputación</h3>
        <p class="intra-body">Cada entrega exitosa mejora tu perfil. Más calificaciones = más envíos = más ingresos.</p>
      </div>
    </div>
    <div class="btn-row" style="margin-top:36px">
      <a class="btn btn-primary intra-badge-text" href="https://intra-chi.vercel.app/trips/new">Publicar mi viaje</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap card center">
    <div class="section-label intra-badge-text">Lo que dicen</div>
    <h2 class="intra-title">Historias reales</h2>
    <p class="lead intra-body">Miles de envíos ya se han completado con éxito en INTRA.</p>
    <div class="grid-3">
      <div class="testimonial">
        <div class="testimonial-stars intra-caption">★★★★★</div>
        <p class="testimonial-text intra-body">"Necesitaba enviar unos documentos urgentes a Medellín. En menos de 24 horas los tenía. Increíble servicio."</p>
        <div class="testimonial-author">
          <div class="author-avatar intra-badge-text">LC</div>
          <div>
            <div class="author-name intra-body-strong">Laura C.</div>
            <div class="author-role intra-caption">Cliente · Bogotá → Medellín</div>
          </div>
        </div>
      </div>
      <div class="testimonial">
        <div class="testimonial-stars intra-caption">★★★★★</div>
        <p class="testimonial-text intra-body">"Viajo cada semana a Cartagena por trabajo. Ahora gano un extra llevando paquetes. No podía ser más fácil."</p>
        <div class="testimonial-author">
          <div class="author-avatar intra-badge-text">AM</div>
          <div>
            <div class="author-name intra-body-strong">Andrés M.</div>
            <div class="author-role intra-caption">Viajero · Bogotá → Cartagena</div>
          </div>
        </div>
      </div>
      <div class="testimonial">
        <div class="testimonial-stars intra-caption">★★★★★</div>
        <p class="testimonial-text intra-body">"Mucho más barato que Servientrega y más rápido. El chat directo con el viajero te da mucha tranquilidad."</p>
        <div class="testimonial-author">
          <div class="author-avatar intra-badge-text">CR</div>
          <div>
            <div class="author-name intra-body-strong">Carolina R.</div>
            <div class="author-role intra-caption">Cliente · Cali → Bogotá</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="faq" class="section">
  <div class="wrap card center">
    <div class="section-label intra-badge-text">Preguntas frecuentes</div>
    <h2 class="intra-title">Resolvemos tus dudas</h2>
    <div class="faq-list">
      <details class="faq-item">
        <summary class="intra-body-strong">¿Qué tipo de paquetes puedo enviar?</summary>
        <p class="intra-body">Documentos, paquetes pequeños y medianos (hasta 10 kg). No se permiten artículos prohibidos por aviación civil (líquidos, sustancias peligrosas, etc.).</p>
      </details>
      <details class="faq-item">
        <summary class="intra-body-strong">¿Qué pasa si mi paquete se pierde o daña?</summary>
        <p class="intra-body">El pago se retiene de forma segura hasta que confirmas la entrega. Si hay algún problema, puedes reportarlo a través de la app y nuestro equipo lo revisa. Estamos trabajando en seguro adicional para mayor tranquilidad.</p>
      </details>
      <details class="faq-item">
        <summary class="intra-body-strong">¿Cómo funciona el pago?</summary>
        <p class="intra-body">El cliente paga al publicar el envío. El dinero se retiene de forma segura hasta que el receptor confirma la entrega. Entonces se libera al viajero. Sin contacto directo con datos de tarjeta.</p>
      </details>
      <details class="faq-item">
        <summary class="intra-body-strong">¿Puedo elegir quién lleva mi paquete?</summary>
        <p class="intra-body">Sí. Puedes ver perfiles de viajeros, sus calificaciones y reviews. Tú decides a quién aceptar. Si nadie te conviene, puedes cancelar sin costo.</p>
      </details>
      <details class="faq-item">
        <summary class="intra-body-strong">¿Cuánto puedo ganar como viajero?</summary>
        <p class="intra-body">Desde $16.000 COP por envío corto, $20.000 por medio y $28.000 por largo. Si viajas con espacio libre y llevas varios paquetes, los ingresos se acumulan.</p>
      </details>
      <details class="faq-item">
        <summary class="intra-body-strong">¿En qué ciudades están disponibles?</summary>
        <p class="intra-body">Bogotá, Medellín, Cartagena, Bucaramanga, Cali, Barranquilla, San Andrés, Pereira, Cúcuta, Leticia, Santa Marta y Villavicencio. Cubrimos las 132 combinaciones de rutas entre estas ciudades.</p>
      </details>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap banner" style="background-image:url(/assets/ChatGPT-Image-1-feb-2026-12_09_59-a.m.png)">
    <div class="overlay"></div>
    <h2 class="intra-title">Tu próximo envío no tiene<br>que ser complicado</h2>
    <p class="lead intra-body" style="color:rgba(255,255,255,.9)">Regístrate gratis, publica en 2 minutos y recibe matchs de viajeros reales hoy mismo.</p>
    <div class="btn-row">
      <a class="btn btn-primary intra-badge-text" href="https://intra-chi.vercel.app/register">Comenzar gratis</a>
      <a class="btn btn-secondary intra-badge-text" href="https://intra-chi.vercel.app/trips/new">Soy viajero</a>
    </div>
    <p class="banner-micro intra-caption">Sin tarjeta de crédito · Sin compromiso · 12 ciudades cubiertas</p>
  </div>
</section>

<footer class="footer">
  <div class="wrap footer-card">
    <div class="footer-grid">
      <div>
        <h2 class="intra-title">INTRA</h2>
        <p class="lead intra-body" style="text-align:left;margin-left:0;margin-top:10px">Plataforma que conecta personas que necesitan enviar documentos o paquetes con viajeros reales entre ciudades colombianas.</p>
        <div class="footer-socials">
          <a href="#" class="social-link intra-caption-strong">Instagram</a>
          <a href="#" class="social-link intra-caption-strong">TikTok</a>
        </div>
      </div>
      <div>
        <h3 class="intra-body-strong">Navegación</h3>
        <div class="list" style="margin-top:12px">
          <a class="intra-body" href="#inicio">Inicio</a>
          <a class="intra-body" href="#como-funciona">Cómo funciona</a>
          <a class="intra-body" href="#precios">Precios</a>
          <a class="intra-body" href="#viaja-y-gana">Viaja y gana</a>
          <a class="intra-body" href="#faq">Preguntas frecuentes</a>
        </div>
      </div>
      <div>
        <h3 class="intra-body-strong">Legal</h3>
        <div class="list" style="margin-top:12px">
          <a class="intra-body" href="/legal/terms-conditions">Términos y condiciones</a>
          <a class="intra-body" href="/legal/privacy-policy">Política de privacidad</a>
        </div>
        <div class="footer-contact">
          <h4 class="intra-body-strong">Contacto</h4>
          <a class="intra-body" href="mailto:soporte@intra.com.co">soporte@intra.com.co</a>
          <p class="intra-body">+57 301 231 9742</p>
        </div>
      </div>
    </div>
    <hr>
    <div class="footer-bottom intra-caption">
      <div>© 2026 INTRA. Todos los derechos reservados.</div>
      <div>Hecho con ❤️ en Colombia</div>
    </div>
  </div>
</footer>
`;

const atlasLandingCss = String.raw`
:root{
  --bg:var(--intra-bg-landing);
  --card:var(--intra-card);
  --brand:var(--intra-blue);
  --green:var(--intra-green);
  --green-dark:var(--intra-green-hover);
  --green-soft:color-mix(in srgb, var(--intra-green) 12%, transparent);
  --muted:var(--intra-text-muted);
  --line:var(--intra-border);
  --soft:var(--intra-soft-surface);
  --shadow:var(--intra-shadow-base);
  --radius:24px;
  --radius-sm:16px;
}

*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--font-inter),Arial,sans-serif;background:var(--bg);color:var(--brand)}
a{text-decoration:none;color:inherit}
img{max-width:100%;display:block}

.wrap{max-width:1200px;margin:0 auto}
.header{padding:20px}
.nav{
  background:rgba(255,255,255,.96);
  border-radius:var(--radius);
  padding:16px 24px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
  box-shadow:0 12px 40px rgba(11,44,74,.08);
  position:sticky;
  top:12px;
  z-index:100;
  backdrop-filter:blur(12px);
}
.nav-left,.nav-center,.nav-right{display:flex;align-items:center}
.nav-left{min-width:140px}
.nav-center{flex:1;justify-content:center}
.nav-right{min-width:260px;justify-content:flex-end;gap:12px}
.logo{height:44px}
.navlinks{display:flex;gap:24px;flex-wrap:wrap}
.navlinks a{color:var(--muted);transition:color .2s}
.navlinks a.active,.navlinks a:hover{color:var(--green)}
.nav-cta{
  display:inline-flex;align-items:center;justify-content:center;
  min-height:44px;padding:11px 18px;border-radius:12px;
  transition:all .2s;
}
.nav-cta:hover{transform:translateY(-1px)}
.nav-cta-outline{border:1px solid var(--line);background:var(--card);color:var(--brand)}
.nav-cta-outline:hover{border-color:var(--brand)}
.nav-cta-solid{background:var(--green);color:var(--card)}
.nav-cta-solid:hover{background:var(--green-dark)}
.hero{padding:0 20px 16px}
.hero-card{
  position:relative;overflow:hidden;border-radius:28px;
  min-height:600px;padding:100px 24px 80px;
  display:flex;align-items:center;justify-content:center;text-align:center;
  color:var(--card);box-shadow:var(--intra-shadow-hero);
  background-size:cover;background-position:center;
}
.overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,26,44,.65),rgba(8,26,44,.5))}
.hero-content{position:relative;z-index:1;max-width:860px}
.hero-badge{
  display:inline-block;padding:8px 18px;border-radius:999px;
  background:color-mix(in srgb, var(--intra-green) 20%, transparent);color:var(--card);
  margin-bottom:20px;backdrop-filter:blur(4px);
  border:1px solid color-mix(in srgb, var(--intra-green) 30%, transparent);
}
.text-green{color:var(--green)}
.hero h1{font-size:52px;line-height:1.08;letter-spacing:-.03em;margin-bottom:18px;color:var(--card)}
.hero h1 strong{color:var(--green)}
.hero-content>p{color:rgba(255,255,255,.9);max-width:700px;margin:0 auto}
.btn-row{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin-top:32px}
.btn{
  display:inline-flex;align-items:center;justify-content:center;
  min-height:50px;padding:14px 32px;border-radius:999px;
  text-transform:uppercase;
  transition:all .2s;cursor:pointer;border:none;
}
.btn:hover{transform:translateY(-2px)}
.btn-primary{background:var(--green);color:var(--card);box-shadow:0 8px 24px color-mix(in srgb, var(--intra-green) 30%, transparent)}
.btn-primary:hover{background:var(--green-dark);box-shadow:0 12px 32px color-mix(in srgb, var(--intra-green) 40%, transparent)}
.btn-secondary{background:color-mix(in srgb, var(--intra-card) 14%, transparent);color:var(--card);border:1px solid color-mix(in srgb, var(--intra-card) 35%, transparent)}
.btn-secondary:hover{background:rgba(255,255,255,.22)}
.btn-outline{background:transparent;color:var(--green);border:2px solid var(--green)}
.btn-outline:hover{background:var(--green-soft)}
.hero-proof{
  margin-top:28px;display:flex;flex-direction:column;align-items:center;gap:4px;
}
.proof-stars{color:var(--intra-rating-star);letter-spacing:2px}
.proof-text{color:rgba(255,255,255,.75)}
.proof-bar{padding:0 20px 16px}
.proof-bar-inner{
  display:flex;align-items:center;justify-content:center;gap:0;
  background:var(--card);border-radius:var(--radius);
  box-shadow:var(--shadow);padding:32px 40px;
}
.proof-item{text-align:center;flex:1}
.proof-num{color:var(--brand)}
.proof-label{color:var(--muted);margin-top:6px;text-transform:uppercase}
.proof-divider{width:1px;height:40px;background:var(--line);flex-shrink:0}
.section{padding:16px 20px}
.card{
  background:var(--card);border-radius:var(--radius);
  box-shadow:var(--shadow);padding:52px 40px;
}
.center{text-align:center}
.section-label{
  display:inline-block;padding:6px 16px;border-radius:999px;
  background:var(--green-soft);color:var(--green);
  text-transform:uppercase;
  margin-bottom:14px;
}
h2{font-size:44px;line-height:1.1;letter-spacing:-.03em}
.lead{max-width:720px;margin:16px auto 0;color:var(--muted)}
.grid-3,.grid-2{display:grid;gap:24px;margin-top:40px}
.grid-3{grid-template-columns:repeat(3,1fr)}
.grid-2{grid-template-columns:repeat(2,1fr)}
.mini{
  background:var(--bg);border-radius:var(--radius-sm);padding:28px 24px;
  transition:transform .2s,box-shadow .2s;
}
.mini:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(11,44,74,.06)}
.num{
  width:52px;height:52px;border-radius:999px;
  display:inline-grid;place-items:center;
  background:var(--green-soft);color:var(--green);
}
.mini h3{margin:16px 0 0}
.mini p{margin:10px 0 0;color:var(--muted)}
.price-card{
  background:var(--bg);border-radius:var(--radius-sm);padding:32px 24px;
  text-align:center;position:relative;transition:transform .2s;
  border:2px solid transparent;
}
.price-card:hover{transform:translateY(-4px)}
.price-popular{
  border-color:var(--green);background:var(--soft);
  box-shadow:0 12px 40px rgba(46,204,113,.12);
}
.popular-tag{
  position:absolute;top:-14px;left:50%;transform:translateX(-50%);
  padding:6px 18px;border-radius:999px;background:var(--green);color:var(--card);
  white-space:nowrap;
}
.price-badge{color:var(--muted);margin-bottom:16px}
.price-tag{display:flex;align-items:flex-start;justify-content:center;gap:2px}
.price-currency{color:var(--brand);margin-top:8px}
.price-amount{font-size:48px;font-weight:900;color:var(--brand);line-height:1;letter-spacing:-.02em}
.price-unit{color:var(--muted);margin-top:4px}
.price-desc{color:var(--muted);margin-top:4px}
.price-examples{
  display:flex;flex-direction:column;gap:6px;margin:20px 0 24px;
  color:var(--muted);
}
.price-note{
  margin-top:32px;color:var(--muted);
  max-width:600px;margin-left:auto;margin-right:auto;
}
.highlight-card{
  background:var(--card);border:1px solid var(--line);
  border-radius:var(--radius-sm);padding:24px;
  transition:transform .2s;
}
.highlight-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(11,44,74,.06)}
.highlight-card h3{margin-bottom:8px}
.highlight-card p{color:var(--muted)}
.testimonial{
  background:var(--bg);border-radius:var(--radius-sm);padding:28px 24px;
  text-align:left;transition:transform .2s;
}
.testimonial:hover{transform:translateY(-3px)}
.testimonial-stars{color:var(--intra-rating-star);letter-spacing:2px;margin-bottom:14px}
.testimonial-text{color:var(--intra-text-subtle);font-style:italic;margin-bottom:18px}
.testimonial-author{display:flex;align-items:center;gap:12px}
.author-avatar{
  width:42px;height:42px;border-radius:50%;
  background:linear-gradient(135deg,var(--green),var(--intra-accent-blue));
  display:flex;align-items:center;justify-content:center;
  color:var(--card);flex-shrink:0;
}
.author-name{color:var(--brand)}
.author-role{color:var(--muted);margin-top:2px}
.faq-list{max-width:720px;margin:36px auto 0;text-align:left}
.faq-item{
  border-bottom:1px solid var(--line);padding:18px 0;
}
.faq-item:last-child{border-bottom:none}
.faq-item summary{
  color:var(--brand);cursor:pointer;
  list-style:none;display:flex;justify-content:space-between;align-items:center;
  transition:color .2s;
}
.faq-item summary::-webkit-details-marker{display:none}
.faq-item summary::after{content:'+';font-size:22px;font-weight:300;color:var(--muted);transition:transform .2s}
.faq-item[open] summary::after{content:'−'}
.faq-item[open] summary{color:var(--green);margin-bottom:12px}
.faq-item p{color:var(--muted);padding-left:0}
.banner{
  position:relative;overflow:hidden;border-radius:28px;
  padding:80px 24px;text-align:center;color:var(--card);
  box-shadow:var(--shadow);background-size:cover;background-position:center;
}
.banner h2{position:relative;z-index:1;font-size:44px;line-height:1.12;letter-spacing:-.03em;color:var(--card)}
.banner .lead{position:relative;z-index:1;color:rgba(255,255,255,.85);margin-top:16px}
.banner .btn-row{position:relative;z-index:1;margin-top:32px}
.banner .overlay{background:linear-gradient(180deg,rgba(8,26,44,.6),rgba(8,26,44,.48))}
.banner-micro{position:relative;z-index:1;color:rgba(255,255,255,.55);margin-top:20px}
.footer{padding:16px 20px 40px}
.footer-card{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:44px 36px}
.footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:36px;align-items:start}
.footer h2{margin-bottom:0}
.footer h3{margin-bottom:0;color:var(--brand)}
.footer hr{border:none;border-top:1px solid var(--line);margin:28px 0 0}
.footer-bottom{display:flex;justify-content:space-between;gap:20px;padding-top:18px;color:var(--muted)}
.list{display:flex;flex-direction:column;gap:14px}
.list a{color:var(--muted);transition:color .2s}
.list a:hover{color:var(--green)}
.footer-contact{display:flex;flex-direction:column;gap:8px;margin-top:22px}
.footer-contact h4{color:var(--brand)}
.footer-contact a,.footer-contact p{color:var(--muted)}
.footer-contact a{transition:color .2s}
.footer-contact a:hover{color:var(--green)}
.footer-socials{display:flex;gap:12px;margin-top:16px}
.social-link{
  color:var(--muted);
  padding:8px 16px;border-radius:999px;border:1px solid var(--line);
  transition:all .2s;
}
.social-link:hover{color:var(--green);border-color:var(--green)}
@media(max-width:980px){
  .hero h1,.banner h2{font-size:38px}
  h2{font-size:34px}
  .grid-3{grid-template-columns:repeat(2,1fr)}
  .grid-2,.footer-grid{grid-template-columns:1fr}
  .nav{flex-direction:column;align-items:stretch}
  .nav-left,.nav-center,.nav-right{width:100%}
  .nav-center{justify-content:flex-start}
  .nav-right{min-width:0;justify-content:flex-start;flex-wrap:wrap}
  .navlinks{gap:12px}
  .proof-bar-inner{padding:24px 20px}
}
@media(max-width:640px){
  .hero-card{min-height:520px;padding:80px 20px 60px}
  .hero h1,.banner h2{font-size:30px}
  .card,.footer-card{padding:32px 20px}
  .grid-3{grid-template-columns:1fr}
  .btn-row{flex-direction:column;align-items:center}
  .btn{width:100%;max-width:320px}
  .nav-center{justify-content:center}
  .navlinks{width:100%;justify-content:center;text-align:center;gap:10px 12px}
  .nav-right{flex-direction:column}
  .nav-faq-link{display:none}
  .nav-cta{width:100%}
  .proof-bar-inner{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 16px;align-items:stretch;padding:24px 20px}
  .proof-divider{display:none}
  .proof-item{display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:center}
  .proof-num,.proof-label{white-space:nowrap}
  .footer-grid{gap:28px}
  .footer-socials{flex-wrap:wrap}
  .footer-bottom{flex-direction:column;align-items:center;text-align:center;gap:8px;padding-top:16px}
  .price-amount{font-size:40px}
}
`;

export default async function HomePage() {
  let user: { id: string } | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();

    user = sessionUser;
  } catch {
    user = null;
  }

  const isAuthenticated = Boolean(user);
  const navActionsHtml = isAuthenticated
    ? `<a class="nav-cta nav-cta-outline intra-body-strong" href="/app">Abrir app</a>
      <a class="nav-cta nav-cta-solid intra-body-strong" href="/app/shipments/new">Crear envío</a>`
    : `<a class="nav-cta nav-cta-outline intra-body-strong" href="/login">Iniciar sesión</a>
      <a class="nav-cta nav-cta-solid intra-body-strong" href="/register">Registrarse</a>`;

  const shipmentCtaHref = isAuthenticated
    ? "/app/shipments/new"
    : "/register?next=/app/shipments/new";
  const tripCtaHref = isAuthenticated
    ? "/app/trips/new"
    : "/register?next=/app/trips/new";

  const landingHtml = atlasLandingHtml
    .replace(
      `<a class="nav-cta nav-cta-outline intra-body-strong" href="https://intra-chi.vercel.app/login">Iniciar sesión</a>
      <a class="nav-cta nav-cta-solid intra-body-strong" href="https://intra-chi.vercel.app/register">Registrarse</a>`,
      navActionsHtml
    )
    .replace(
      `<a class="btn btn-primary intra-badge-text" href="https://intra-chi.vercel.app/register">Comenzar gratis</a>`,
      isAuthenticated
        ? `<a class="btn btn-primary intra-badge-text" href="/app">Abrir dashboard</a>`
        : `<a class="btn btn-primary intra-badge-text" href="/register">Comenzar gratis</a>`
    )
    .replaceAll("https://intra-chi.vercel.app/shipments/new", shipmentCtaHref)
    .replaceAll("https://intra-chi.vercel.app/trips/new", tripCtaHref)
    .replaceAll(
      "https://intra-chi.vercel.app/register",
      isAuthenticated ? "/app" : "/register"
    )
    .replaceAll(
      "https://intra-chi.vercel.app/login",
      isAuthenticated ? "/app" : "/login"
    );

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: landingHtml }} />
      <style dangerouslySetInnerHTML={{ __html: atlasLandingCss }} />
    </>
  );
}
