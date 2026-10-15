import { redirect } from "next/navigation"
import { AppNavbar } from "@/components/app-navbar"
import { requireConfiguredAdminUser } from "@/lib/auth/admin"
import SecurityClient from "./SecurityClient"

export default async function AdminSecurityPage() {
  let userId: string
  try {
    // A confirmed identity may enroll/challenge while still at aal1. This
    // route does not create a service-role client or read administrative data.
    const { user } = await requireConfiguredAdminUser()
    userId = user.id
  } catch {
    redirect("/app")
  }

  return (
    <>
      <AppNavbar />
      <main className="intra-page-shell px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <SecurityClient key={userId} userId={userId} />
        </div>
      </main>
    </>
  )
}
