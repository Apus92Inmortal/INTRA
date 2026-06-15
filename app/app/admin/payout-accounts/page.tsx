import { AdminFeedback } from "@/app/app/admin/AdminUi"
import { requireAdminUser } from "@/lib/auth/admin"
import { getPayoutAccountDisplayName } from "@/lib/payments/wallet"
import { createAdminClient } from "@/lib/supabase/admin"
import PayoutAccountsReviewClient from "./PayoutAccountsReviewClient"

type ProfileRow = {
  id: string
  full_name: string | null
}

type AccountRow = {
  id: string
  traveler_user_id?: string | null
  account_holder_name?: string | null
  document_number?: string | null
  bank_name: string | null
  account_type: string | null
  account_number: string | null
  breb_key: string | null
  is_default?: boolean | null
  verification_status?: string | null
  verification_notes?: string | null
  verified_at?: string | null
  created_at?: string | null
}

export default async function AdminPayoutAccountsPage() {
  let loadError: string | null = null
  let hasAccess = false
  let payoutAccounts: Array<{
    id: string
    travelerUserId: string
    travelerName: string
    accountHolderName: string
    documentNumber: string
    accountLabel: string
    accountNumber: string
    brebKey: string | null
    isDefault: boolean | null
    verificationStatus: string | null
    verificationNotes: string | null
    verifiedAt: string | null
    createdAt: string | null
  }> = []

  try {
    await requireAdminUser()
    hasAccess = true

    const admin = createAdminClient()
    const { data: payoutAccountRows, error: payoutAccountsError } = await admin
      .from("traveler_payout_accounts")
      .select(
        "id, traveler_user_id, account_holder_name, document_number, bank_name, account_type, account_number, breb_key, is_default, verification_status, verification_notes, verified_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100)

    if (payoutAccountsError) {
      loadError = payoutAccountsError.message
    } else {
      const accountsForReview = (payoutAccountRows ?? []) as AccountRow[]
      const travelerIds = Array.from(
        new Set(
          accountsForReview
            .map((account) => account.traveler_user_id)
            .filter(Boolean),
        ),
      ) as string[]

      const { data: profileRows, error: profileError } = travelerIds.length
        ? await admin
            .from("profiles")
            .select("id, full_name")
            .in("id", travelerIds)
        : { data: [] as ProfileRow[], error: null }

      if (profileError) {
        loadError = profileError.message
      } else {
        const profiles = new Map(
          ((profileRows ?? []) as ProfileRow[]).map((profile) => [
            profile.id,
            profile,
          ]),
        )
        const accountStatusPriority: Record<string, number> = {
          pending: 0,
          rejected: 1,
          verified: 2,
        }

        payoutAccounts = accountsForReview
          .map((account) => {
            const travelerId = account.traveler_user_id ?? ""
            const traveler = profiles.get(travelerId)

            return {
              id: account.id,
              travelerUserId: travelerId,
              travelerName: traveler?.full_name || "Usuario sin nombre",
              accountHolderName: account.account_holder_name || "Sin titular",
              documentNumber: account.document_number || "Sin documento",
              accountLabel: getPayoutAccountDisplayName(account),
              accountNumber: account.account_number?.trim() || "Sin cuenta",
              brebKey: account.breb_key ?? null,
              isDefault: account.is_default ?? null,
              verificationStatus: account.verification_status ?? null,
              verificationNotes: account.verification_notes ?? null,
              verifiedAt: account.verified_at ?? null,
              createdAt: account.created_at ?? null,
            }
          })
          .sort((a, b) => {
            const statusDiff =
              (accountStatusPriority[a.verificationStatus ?? ""] ?? 99) -
              (accountStatusPriority[b.verificationStatus ?? ""] ?? 99)

            if (statusDiff !== 0) {
              return statusDiff
            }

            return (
              new Date(b.createdAt ?? 0).getTime() -
              new Date(a.createdAt ?? 0).getTime()
            )
          })
      }
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "No pudimos cargar las cuentas."
  }

  return loadError || !hasAccess ? (
    <section className="rounded-3xl border border-intra-danger-border bg-intra-card p-6 shadow-sm sm:p-8">
      {loadError ? (
        <AdminFeedback type="error">{loadError}</AdminFeedback>
      ) : null}
    </section>
  ) : (
    <PayoutAccountsReviewClient payoutAccounts={payoutAccounts} />
  )
}
