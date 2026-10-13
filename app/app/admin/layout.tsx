import type { ReactNode } from "react"
import { AppNavbar } from "@/components/app-navbar"
import { redirect } from "next/navigation"
import { AdminMfaRequiredError, requireAdminUser } from "@/lib/auth/admin"
import AdminSectionNav from "./AdminSectionNav"

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  try {
    await requireAdminUser()
  } catch (error) {
    // The enrollment route lives outside this layout to prevent redirect loops.
    if (error instanceof AdminMfaRequiredError) redirect("/app/profile/security")
    redirect("/app")
  }

  return (
    <>
      <AppNavbar />

      <main className="min-h-screen bg-intra-bg-app px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="intra-h1">Admin</h1>
              </div>
            </div>

            <div className="mt-6">
              <AdminSectionNav />
            </div>
          </section>

          {children}
        </div>
      </main>
    </>
  )
}
