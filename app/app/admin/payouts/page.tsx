import { requireAdminUser } from "@/lib/auth/admin"
import { getPayoutAccountDisplayName } from "@/lib/payments/wallet"
import { createAdminClient } from "@/lib/supabase/admin"
import PayoutReviewClient from "./PayoutReviewClient"

type PayoutRow = {
  id: string
  payout_code: string | null
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

export default async function AdminPayoutsPage() {
  let loadError: string | null = null
  let hasAccess = false
  let enrichedPayouts: Array<{
    id: string
    payoutCode: string | null
    amount: number | null
    status: string | null
    requested_at: string | null
    reviewed_at: string | null
    paid_at: string | null
    review_notes: string | null
    paid_reference: string | null
    travelerName: string
    accountLabel: string
    accountNumber: string
    brebKey: string | null
  }> = []
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
    const { data: payoutRows, error: payoutsError } = await admin
      .from("payouts")
      .select(
        "id, payout_code, traveler_user_id, payout_account_id, amount, status, requested_at, reviewed_at, paid_at, review_notes, paid_reference"
      )
      .order("status", { ascending: true })
      .order("requested_at", { ascending: false })

    if (payoutsError) {
      loadError = payoutsError.message
    } else {
      const payouts = (payoutRows ?? []) as PayoutRow[]
      const { data: payoutAccountRows, error: payoutAccountsError } = await admin
        .from("traveler_payout_accounts")
        .select(
          "id, traveler_user_id, account_holder_name, document_number, bank_name, account_type, account_number, breb_key, is_default, verification_status, verification_notes, verified_at, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100)

      if (payoutAccountsError) {
        loadError = payoutAccountsError.message
      }

      const accountsForReview = (payoutAccountRows ?? []) as AccountRow[]
      const travelerIds = Array.from(
        new Set([
          ...payouts.map((payout) => payout.traveler_user_id).filter(Boolean),
          ...accountsForReview.map((account) => account.traveler_user_id).filter(Boolean),
        ])
      ) as string[]
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
          payoutCode: payout.payout_code,
          travelerName: traveler?.full_name || "Viajero sin nombre",
          accountLabel: account ? getPayoutAccountDisplayName(account) : "Cuenta no disponible",
          accountNumber: account?.account_number?.trim() || "Sin cuenta",
          brebKey: account?.breb_key ?? null,
        }
      }).sort((a, b) => {
        const statusDiff = (statusPriority[a.status ?? ""] ?? 99) - (statusPriority[b.status ?? ""] ?? 99)

        if (statusDiff !== 0) {
          return statusDiff
        }

          return new Date(b.requested_at ?? 0).getTime() - new Date(a.requested_at ?? 0).getTime()
      })

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

          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        })
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No pudimos cargar el panel admin."
  }

  return loadError || !hasAccess ? (
    <section className="rounded-3xl border border-intra-danger-border bg-intra-card p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-bold text-intra-blue">Retiros</h2>
      <p className="mt-2 text-sm text-intra-text-subtle sm:text-base">
        No pudimos cargar este módulo administrativo en este entorno.
      </p>
      {loadError ? (
        <div className="mt-4 rounded-2xl border border-intra-danger-border bg-intra-danger-soft px-4 py-3 text-sm text-intra-danger">
          {loadError}
        </div>
      ) : null}
    </section>
  ) : (
    <PayoutReviewClient payouts={enrichedPayouts} payoutAccounts={payoutAccounts} />
  )
}
