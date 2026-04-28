import { AppNavbar } from "@/components/app-navbar"
import { requireAdminUser } from "@/lib/auth/admin"
import { getPayoutAccountDisplayName, maskAccountNumber } from "@/lib/payments/wallet"
import { createAdminClient } from "@/lib/supabase/admin"
import PayoutReviewClient from "./PayoutReviewClient"

type PayoutRow = {
  id: string
  traveler_user_id: string
  payout_account_id: string | null
  amount: number | null
  status: string | null
  requested_at: string | null
  reviewed_at: string | null
  paid_at: string | null
  review_notes: string | null
  paid_reference: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
}

type AccountRow = {
  id: string
  bank_name: string | null
  account_type: string | null
  account_number: string | null
  breb_key: string | null
}

export default async function AdminPayoutsPage() {
  let loadError: string | null = null
  let hasAccess = false
  let enrichedPayouts: Array<{
    id: string
    amount: number | null
    status: string | null
    requested_at: string | null
    reviewed_at: string | null
    paid_at: string | null
    review_notes: string | null
    paid_reference: string | null
    travelerName: string
    accountLabel: string
    accountMask: string
    brebKey: string | null
  }> = []

  try {
    await requireAdminUser()
    hasAccess = true

    const admin = createAdminClient()
    const { data: payoutRows, error: payoutsError } = await admin
      .from("payouts")
      .select(
        "id, traveler_user_id, payout_account_id, amount, status, requested_at, reviewed_at, paid_at, review_notes, paid_reference"
      )
      .order("status", { ascending: true })
      .order("requested_at", { ascending: false })

    if (payoutsError) {
      loadError = payoutsError.message
    } else {
      const payouts = (payoutRows ?? []) as PayoutRow[]
      const travelerIds = Array.from(
        new Set(payouts.map((payout) => payout.traveler_user_id).filter(Boolean))
      )
      const accountIds = Array.from(
        new Set(payouts.map((payout) => payout.payout_account_id).filter(Boolean))
      ) as string[]

      const [profilesRes, accountsRes] = await Promise.all([
        travelerIds.length
          ? admin.from("profiles").select("id, full_name").in("id", travelerIds)
          : Promise.resolve({ data: [] as ProfileRow[] }),
        accountIds.length
          ? admin
              .from("traveler_payout_accounts")
              .select("id, bank_name, account_type, account_number, breb_key")
              .in("id", accountIds)
          : Promise.resolve({ data: [] as AccountRow[] }),
      ])

      const profiles = new Map(
        ((profilesRes.data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile])
      )
      const accounts = new Map(
        ((accountsRes.data ?? []) as AccountRow[]).map((account) => [account.id, account])
      )

      const statusPriority: Record<string, number> = {
        pending: 0,
        approved: 1,
        paid: 2,
        rejected: 3,
      }

      enrichedPayouts = payouts.map((payout) => {
        const traveler = profiles.get(payout.traveler_user_id)
        const account = payout.payout_account_id ? accounts.get(payout.payout_account_id) : null

        return {
          ...payout,
          travelerName: traveler?.full_name || "Viajero sin nombre",
          accountLabel: account ? getPayoutAccountDisplayName(account) : "Cuenta no disponible",
          accountMask: account ? maskAccountNumber(account.account_number) : "Sin cuenta",
          brebKey: account?.breb_key ?? null,
        }
      }).sort((a, b) => {
        const statusDiff = (statusPriority[a.status ?? ""] ?? 99) - (statusPriority[b.status ?? ""] ?? 99)

        if (statusDiff !== 0) {
          return statusDiff
        }

        return new Date(b.requested_at ?? 0).getTime() - new Date(a.requested_at ?? 0).getTime()
      })
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No pudimos cargar el panel admin."
  }

  return (
    <>
      <AppNavbar />
      <main className="min-h-screen bg-[#EEF2F7] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {loadError || !hasAccess ? (
            <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
              <h1 className="text-2xl font-bold text-[#0B2C4A]">Admin de retiros</h1>
              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                No pudimos cargar el panel administrativo en este entorno.
              </p>
              {loadError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {loadError}
                </div>
              ) : null}
            </div>
          ) : (
            <PayoutReviewClient payouts={enrichedPayouts} />
          )}
        </div>
      </main>
    </>
  )
}
