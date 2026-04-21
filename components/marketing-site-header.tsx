"use client"

import Image from "next/image"
import Link from "next/link"
import { Instagram, Menu, Search, X } from "lucide-react"
import { useState } from "react"
import { usePathname } from "next/navigation"

const links = [
  { href: "/", label: "Inicio" },
  { href: "/como-funciona", label: "Cómo funciona" },
  { href: "/viaja-y-gana", label: "Viaja y gana" },
  { href: "/contact", label: "Contáctanos" },
]

function NavLink({ href, label, mobile = false }: { href: string; label: string; mobile?: boolean }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={`transition ${
        mobile
          ? `block rounded-2xl px-4 py-3 text-base font-semibold ${
              isActive
                ? "bg-[#2ECC71] text-white"
                : "bg-white text-[#0B2C4A] hover:bg-[#eef6f1]"
            }`
          : `text-sm font-semibold ${
              isActive ? "text-[#2ECC71]" : "text-[#0B2C4A] hover:text-[#2ECC71]"
            }`
      }`}
    >
      {label}
    </Link>
  )
}

export function MarketingSiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="relative z-30 px-5 pt-5 md:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[24px] bg-white/95 px-5 py-4 shadow-[0_12px_40px_rgba(11,44,74,0.08)] backdrop-blur md:px-8">
        <Link href="/" className="flex items-center">
          <Image
            src="/landing/cropped-Logo2sinfondo-1.png"
            alt="INTRA"
            width={180}
            height={60}
            priority
            className="h-auto w-[140px] md:w-[170px]"
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <NavLink key={link.href} href={link.href} label={link.label} />
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="text-[#0B2C4A] transition hover:text-[#2ECC71]"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <button
            type="button"
            aria-label="Buscar"
            className="text-[#0B2C4A] transition hover:text-[#2ECC71]"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          className="rounded-full bg-[#f4f1ea] p-2 text-[#0B2C4A] md:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-4 max-w-7xl rounded-[28px] bg-[#f4f1ea] p-4 shadow-[0_20px_60px_rgba(11,44,74,0.08)] md:hidden">
          <div className="space-y-3">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} mobile />
            ))}
          </div>
          <div className="mt-4 flex items-center gap-4 px-2 text-[#0B2C4A]">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <Instagram className="h-5 w-5" />
            </a>
            <Search className="h-5 w-5" />
          </div>
        </div>
      )}
    </header>
  )
}
