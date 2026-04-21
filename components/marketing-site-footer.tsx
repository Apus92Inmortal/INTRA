import Link from "next/link"
import { Instagram, Users } from "lucide-react"

const links = [
  { href: "/", label: "Inicio" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/viaja-y-gana", label: "Viaja y gana" },
  { href: "/contact", label: "Contáctanos" },
]

export function MarketingSiteFooter() {
  return (
    <footer className="px-5 pb-10 pt-4 md:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl rounded-[28px] bg-white px-6 py-10 shadow-[0_16px_50px_rgba(11,44,74,0.08)] md:px-10">
        <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_auto] md:items-start">
          <div>
            <h2 className="text-2xl font-semibold text-[#0B2C4A]">Sobre INTRA</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
              <strong>INTRA</strong>
              <br />
              Plataforma que conecta personas que necesitan enviar documentos o
              paquetes pequeños con viajeros reales entre aeropuertos.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold text-[#0B2C4A]">Menú</h2>
            <nav className="mt-4 space-y-3">
              {links.map((link) => (
                <div key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-medium text-[#2ECC71] transition hover:text-[#0B2C4A]"
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
            </nav>
          </div>

          <div className="flex min-w-[140px] items-center gap-3 rounded-[24px] bg-[#f7f3eb] px-5 py-4 text-[#0B2C4A]">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2ECC71]/15 text-[#2ECC71]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="text-2xl font-bold">1</div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Usuarios
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>© 2026 INTRA</p>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition hover:text-[#2ECC71]"
          >
            <Instagram className="h-4 w-4" /> Instagram
          </a>
        </div>
      </div>
    </footer>
  )
}
