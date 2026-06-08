"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BadgeCheck, CircleDollarSign, ShieldAlert } from "lucide-react"

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
  {
    href: "/app/admin/disputes",
    label: "Disputas",
    icon: ShieldAlert,
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
            className={`inline-flex min-h-11 items-center gap-2 rounded-[var(--intra-radius-xs)] border px-4 py-3 text-sm font-semibold transition ${
              isActive
                ? "border-intra-blue bg-intra-blue text-intra-card"
                : "border-intra-border-soft bg-intra-card text-intra-text-subtle hover:border-intra-blue/20 hover:text-intra-blue"
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
