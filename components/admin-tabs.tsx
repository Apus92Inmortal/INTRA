"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BadgeCheck, CircleDollarSign } from "lucide-react"

const ADMIN_LINKS = [
  {
    href: "/app/admin/payouts",
    label: "Retiros",
    icon: CircleDollarSign,
  },
  {
    href: "/app/admin/verifications",
    label: "Verificaciones",
    icon: BadgeCheck,
  },
]

export function AdminTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-3" aria-label="Módulos administrativos">
      {ADMIN_LINKS.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
        const Icon = link.icon

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              isActive
                ? "border-[#0B2C4A] bg-[#0B2C4A] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-[#0B2C4A]/20 hover:text-[#0B2C4A]"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
