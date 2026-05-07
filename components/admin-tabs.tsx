"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const ADMIN_LINKS = [
  {
    href: "/app/admin/payouts",
    label: "Retiros",
    description: "Solicitudes y pagos",
  },
  {
    href: "/app/admin/verifications",
    label: "Verificaciones",
    description: "Documento y selfie",
  },
]

export function AdminTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-3" aria-label="Módulos administrativos">
      {ADMIN_LINKS.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-2xl border px-4 py-3 text-sm transition ${
              isActive
                ? "border-[#0B2C4A] bg-[#0B2C4A] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#0B2C4A]/20 hover:text-[#0B2C4A]"
            }`}
          >
            <p className="font-semibold">{link.label}</p>
            <p className={`mt-1 text-xs ${isActive ? "text-white/75" : "text-slate-400"}`}>
              {link.description}
            </p>
          </Link>
        )
      })}
    </nav>
  )
}
