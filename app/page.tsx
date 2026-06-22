import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: {
    absolute: "INTRA — Envía paquetes entre ciudades con viajeros",
  },
  description:
    "INTRA conecta personas que necesitan enviar paquetes o documentos entre ciudades con viajeros disponibles en la misma ruta.",
  openGraph: {
    title: "INTRA — Envía paquetes entre ciudades con viajeros",
    description:
      "Publica tu envío, acepta un match, coordina por chat y paga dentro de la app.",
    type: "website",
    url: "https://www.intra.com.co",
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
    title: "INTRA — Envía paquetes entre ciudades con viajeros",
    description:
      "Publica tu envío, acepta un match, coordina por chat y paga dentro de la app.",
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
      <div class="hero-badge intra-badge-text">Pago protegido · Chat directo · Matches por ruta</div>
      <h1 class="intra-title">Envía paquetes entre ciudades aprovechando viajeros que ya van en camino</h1>
      <p class="intra-subtitle">Publica tu envío, acepta un match, coordina por chat y paga dentro de la app.</p>
      <div class="btn-row">
        <a class="btn btn-primary intra-badge-text" href="https://intra-chi.vercel.app/shipments/new">Publicar envío</a>
        <a class="btn btn-secondary intra-badge-text" href="https://intra-chi.vercel.app/trips/new">Publicar viaje</a>
      </div>
      <div class="hero-proof">
        <div class="proof-text intra-caption">Para enviar paquetes o documentos · Para ganar dinero extra viajando</div>
      </div>
    </div>
  </div>
</section>

<section class="proof-bar">
  <div class="wrap proof-bar-inner">
    <div class="proof-item">
      <div class="proof-num intra-subtitle">Pago protegido</div>
      <div class="proof-label intra-body">Tu pago se gestiona dentro del flujo de INTRA y se libera según el avance de la entrega.</div>
    </div>
    <div class="proof-divider"></div>
    <div class="proof-item">
      <div class="proof-num intra-subtitle">Chat directo</div>
      <div class="proof-label intra-body">Coordina detalles con el viajero desde la app, sin perder el contexto del envío.</div>
    </div>
    <div class="proof-divider"></div>
    <div class="proof-item">
      <div class="proof-num intra-subtitle">Matches por ruta</div>
      <div class="proof-label intra-body">Conectamos envíos y viajes compatibles para aprovechar mejor cada trayecto.</div>
    </div>
    <div class="proof-divider"></div>
    <div class="proof-item">
      <div class="proof-num intra-subtitle">Perfiles y evidencias</div>
      <div class="proof-label intra-body">Revisa información del usuario, acuerdos y soportes del envío dentro de la plataforma.</div>
    </div>
  </div>
</section>

<section id="como-funciona" class="section">
  <div class="wrap card center">
    <div class="section-label intra-badge-text">Para enviar</div>
    <h2 class="intra-title">Publica un envío y encuentra un viajero compatible</h2>
    <p class="lead intra-body">Una forma directa de mover paquetes o documentos entre ciudades, con coordinación dentro de la app y contexto claro para ambas partes.</p>
    <div class="grid-3">
      <div class="mini">
        <div class="num intra-badge-text">01</div>
        <h3 class="intra-subtitle">Publica tu envío</h3>
        <p class="intra-body">Indica origen, destino, peso y detalles básicos del paquete.</p>
      </div>
      <div class="mini">
        <div class="num intra-badge-text">02</div>
        <h3 class="intra-subtitle">Elige un viajero compatible</h3>
        <p class="intra-body">Revisa las opciones disponibles y acepta el match que más te convenga.</p>
      </div>
      <div class="mini">
        <div class="num intra-badge-text">03</div>
        <h3 class="intra-subtitle">Coordina y confirma</h3>
        <p class="intra-body">Habla por chat, entrega el paquete y confirma cuando lo recibas.</p>
      </div>
    </div>
  </div>
</section>

<section id="precios" class="section">
  <div class="wrap card center">
    <div class="section-label intra-badge-text">Transparente</div>
    <h2 class="intra-title">Precios claros por ruta</h2>
    <p class="lead intra-body">Antes de aceptar un envío, la app muestra el valor del trayecto para que puedas decidir con claridad.</p>
    <div class="grid-3">
      <div class="price-card">
        <div class="price-badge intra-body-strong">
          <svg class="price-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11Z"/><path d="M12 10.5h.01"/></svg>
          <span>Corta distancia</span>
        </div>
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
        <div class="popular-tag intra-badge-text">Más popular</div>
        <div class="price-badge intra-body-strong">
          <svg class="price-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M4 20h16"/><path d="M6 20V8l6-3 6 3v12"/><path d="M9 11h.01"/><path d="M12 11h.01"/><path d="M15 11h.01"/><path d="M9 15h.01"/><path d="M12 15h.01"/><path d="M15 15h.01"/></svg>
          <span>Media distancia</span>
        </div>
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
        <div class="price-badge intra-body-strong">
          <svg class="price-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M10.5 20.5 13 13l7.5-2.5-3-3L10 10 7.5 2.5 5 5l1.5 6.5L2 14l2 2 4.5-1.5 6.5 1.5 2.5 2.5Z"/></svg>
          <span>Larga distancia</span>
        </div>
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
    <p class="price-note intra-body">El pago se gestiona dentro de INTRA y sigue las reglas operativas del envío, la entrega y cualquier revisión necesaria.</p>
  </div>
</section>

<section id="viaja-y-gana" class="section">
  <div class="wrap card center">
    <div class="section-label intra-badge-text">Para viajeros</div>
    <h2 class="intra-title">Publica tu viaje y gana con rutas que ya vas a hacer</h2>
    <p class="lead intra-body">Indica tu ruta, fecha y capacidad disponible. Acepta solo los paquetes que encajan con tu trayecto y coordina la entrega desde la app.</p>
    <div class="grid-3">
      <div class="highlight-card">
        <div class="num intra-badge-text">01</div>
        <h3 class="intra-subtitle">Publica tu viaje</h3>
        <p class="intra-body">Indica tu ruta, fecha y capacidad disponible.</p>
      </div>
      <div class="highlight-card">
        <div class="num intra-badge-text">02</div>
        <h3 class="intra-subtitle">Recibe envíos compatibles</h3>
        <p class="intra-body">Acepta solo los paquetes que se ajusten a tu trayecto.</p>
      </div>
      <div class="highlight-card">
        <div class="num intra-badge-text">03</div>
        <h3 class="intra-subtitle">Entrega y gana</h3>
        <p class="intra-body">Coordina con el cliente, realiza la entrega y recibe tu ganancia según el flujo de INTRA.</p>
      </div>
    </div>
    <div class="btn-row" style="margin-top:36px">
      <a class="btn btn-primary intra-badge-text" href="https://intra-chi.vercel.app/trips/new">Publicar viaje</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap card center">
    <div class="section-label intra-badge-text">Por qué confiar</div>
    <h2 class="intra-title">Confianza en cada envío</h2>
    <p class="lead intra-body">INTRA organiza la información del paquete, el viaje, el match y la coordinación para que puedas decidir con más seguridad.</p>
    <div class="grid-3">
      <div class="testimonial">
        <p class="testimonial-text intra-body">El cliente publica origen, destino, peso y detalles básicos para que el viajero sepa qué está aceptando.</p>
        <div class="testimonial-author">
          <div class="author-avatar intra-badge-text">01</div>
          <div>
            <div class="author-name intra-body-strong">Información del paquete</div>
            <div class="author-role intra-caption">Detalles antes del match</div>
          </div>
        </div>
      </div>
      <div class="testimonial">
        <p class="testimonial-text intra-body">El chat conserva la conversación relacionada con el envío para coordinar puntos, horarios y acuerdos.</p>
        <div class="testimonial-author">
          <div class="author-avatar intra-badge-text">02</div>
          <div>
            <div class="author-name intra-body-strong">Coordinación dentro de la app</div>
            <div class="author-role intra-caption">Chat y contexto operativo</div>
          </div>
        </div>
      </div>
      <div class="testimonial">
        <p class="testimonial-text intra-body">Los soportes del envío y el avance de la entrega quedan asociados al flujo para facilitar seguimiento.</p>
        <div class="testimonial-author">
          <div class="author-avatar intra-badge-text">03</div>
          <div>
            <div class="author-name intra-body-strong">Evidencias y seguimiento</div>
            <div class="author-role intra-caption">Soportes del envío</div>
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
        <p class="intra-body">Puedes reportar el problema dentro de la app. INTRA conserva el contexto del envío, el match, el chat y las evidencias para apoyar la revisión operativa.</p>
      </details>
      <details class="faq-item">
        <summary class="intra-body-strong">¿Cómo funciona el pago?</summary>
        <p class="intra-body">El pago se gestiona dentro del flujo de INTRA. La liberación al viajero depende del avance de la entrega y de las reglas operativas vigentes.</p>
      </details>
      <details class="faq-item">
        <summary class="intra-body-strong">¿Puedo elegir quién lleva mi paquete?</summary>
        <p class="intra-body">Sí. Puedes revisar las opciones compatibles y aceptar el match que más te convenga antes de coordinar el envío.</p>
      </details>
      <details class="faq-item">
        <summary class="intra-body-strong">¿Cuánto puedo ganar como viajero?</summary>
        <p class="intra-body">La ganancia depende de la ruta, el envío y las condiciones del match. Antes de aceptar, revisas si el paquete se ajusta a tu trayecto y capacidad.</p>
      </details>
      <details class="faq-item">
        <summary class="intra-body-strong">¿En qué ciudades están disponibles?</summary>
        <p class="intra-body">INTRA está pensado para envíos entre ciudades. La disponibilidad depende de las rutas publicadas por viajeros y de los envíos activos en cada momento.</p>
      </details>
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap banner" style="background-image:url(/assets/ChatGPT-Image-1-feb-2026-12_09_59-a.m.png)">
    <div class="overlay"></div>
    <h2 class="intra-title">Envía mejor. Viaja mejor. Aprovecha cada ruta con INTRA.</h2>
    <p class="lead intra-body" style="color:rgba(255,255,255,.9)">Publica un envío o un viaje y deja que INTRA conecte rutas compatibles dentro de la app.</p>
    <div class="btn-row">
      <a class="btn btn-primary intra-badge-text" href="https://intra-chi.vercel.app/shipments/new">Publicar envío</a>
      <a class="btn btn-secondary intra-badge-text" href="https://intra-chi.vercel.app/trips/new">Publicar viaje</a>
    </div>
    <p class="banner-micro intra-caption">Pago protegido · Chat directo · Matches por ruta</p>
  </div>
</section>

<footer class="footer">
  <div class="wrap footer-card">
    <div class="footer-grid">
      <div>
        <img class="footer-logo" src="/assets/cropped-Logo2sinfondo-1.png" alt="INTRA">
        <p class="lead intra-body" style="text-align:left;margin-left:0;margin-top:10px">Plataforma que conecta personas que necesitan enviar documentos o paquetes con viajeros reales entre ciudades colombianas.</p>
        <div class="footer-socials">
          <a href="#" class="social-link intra-caption-strong">Instagram</a>
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
  min-height:560px;padding:84px 24px 68px;
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
.hero h1{font-size:48px;line-height:1.08;letter-spacing:0;margin-bottom:16px;color:var(--card)}
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
.proof-num{line-height:1.15}
.proof-label{color:var(--muted);margin-top:8px}
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
.price-badge{
  display:inline-flex;align-items:center;justify-content:center;gap:7px;
  color:var(--muted);margin-bottom:16px;
}
.price-icon{
  width:16px;height:16px;flex:0 0 16px;
  stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;fill:none;
}
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
.highlight-card .num{margin-bottom:16px}
.highlight-card p{color:var(--muted)}
.testimonial{
  background:var(--bg);border-radius:var(--radius-sm);padding:28px 24px;
  text-align:left;transition:transform .2s;
}
.testimonial:hover{transform:translateY(-3px)}
.testimonial-stars{color:var(--intra-rating-star);letter-spacing:2px;margin-bottom:14px}
.testimonial-text{color:var(--intra-text-subtle);margin-bottom:18px}
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
.footer-logo{width:140px;height:auto}
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
  .header{padding:12px}
  .nav{padding:12px 16px;gap:12px;border-radius:18px}
  .logo{height:38px}
  .hero{padding:0 12px 12px}
  .hero-card{min-height:auto;padding:48px 16px 42px;border-radius:22px}
  .hero h1,.banner h2{font-size:28px}
  .hero-content>p{font-size:16px;line-height:1.45}
  .hero-badge{margin-bottom:14px}
  .hero-proof{margin-top:18px}
  .card,.footer-card{padding:32px 20px}
  .grid-3{grid-template-columns:1fr}
  .btn-row{flex-direction:column;align-items:center}
  .btn{width:100%;max-width:320px}
  .nav-center{justify-content:center}
  .nav-center{display:none}
  .navlinks{width:100%;justify-content:center;text-align:center;gap:10px 12px}
  .nav-right{flex-direction:row;gap:8px}
  .nav-faq-link{display:none}
  .nav-cta{width:auto;flex:1;min-height:40px;padding:9px 10px}
  .proof-bar-inner{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 12px;align-items:stretch;padding:22px 16px}
  .proof-divider{display:none}
  .proof-item{display:flex;min-width:0;flex-direction:column;align-items:center;justify-content:center}
  .proof-num{font-size:17px;line-height:1.2;white-space:normal}
  .proof-label{font-size:14px;line-height:1.4;margin-top:6px;white-space:normal;overflow-wrap:anywhere}
  .footer-grid{gap:28px}
  .footer-socials{flex-wrap:wrap}
  .footer-bottom{flex-direction:column;align-items:center;text-align:center;gap:8px;padding-top:16px}
  .price-amount{font-size:40px}
}
@media(max-width:360px){
  .proof-bar-inner{grid-template-columns:1fr;gap:16px}
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
