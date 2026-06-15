"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BadgeCheck,
  Bell,
  CircleDollarSign,
  CreditCard,
  ShieldAlert,
} from "lucide-react"

const ADMIN_SECTIONS = [
  {
    href: "/app/admin/payouts",
    label: "Retiros",
    icon: CircleDollarSign,
  },
  {
    href: "/app/admin/payout-accounts",
    label: "Cuentas",
    icon: CreditCard,
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
  {
    href: "/app/admin/alerts",
    label: "Alertas",
    icon: Bell,
  },
]

export default function AdminSectionNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Secciones admin"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {ADMIN_SECTIONS.map((section) => {
        const isActive =
          pathname === section.href || pathname.startsWith(`${section.href}/`)
        const Icon = section.icon

        return (
          <Link
            key={section.href}
            href={section.href}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--intra-radius-xs)] border px-4 py-2.5 intra-badge-text transition ${
              isActive
                ? "border-intra-blue bg-intra-blue text-intra-card"
                : "border-intra-border-soft bg-intra-card text-intra-text-subtle hover:border-intra-blue hover:text-intra-blue"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}
