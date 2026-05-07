import type { ReactNode } from "react"
import { AppNavbar } from "@/components/app-navbar"
import { AdminTabs } from "@/components/admin-tabs"
import { isConfiguredAdmin } from "@/lib/auth/admin"
import { createClient } from "@/lib/supabase/server"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const showTabs = user ? isConfiguredAdmin({ id: user.id, email: user.email }) : false

  return (
    <>
      <AppNavbar />

      <main className="min-h-screen bg-[#EEF2F7] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#0B2C4A]">Panel de Administración</h1>
                <p className="mt-2 text-sm text-slate-500 sm:text-base lg:max-w-none lg:whitespace-nowrap">
                  Administra retiros, verificaciones, usuarios y operaciones internas desde un solo panel de control.
                </p>
              </div>
            </div>

            {showTabs ? <div className="mt-6"><AdminTabs /></div> : null}
          </section>

          {children}
        </div>
      </main>
    </>
  )
}

