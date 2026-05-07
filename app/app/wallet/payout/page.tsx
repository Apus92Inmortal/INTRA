import { AppNavbar } from "@/components/app-navbar"
import { createClient } from "@/lib/supabase/server"
import { getOpenPayoutAmount } from "@/lib/payments/wallet"
import PayoutRequestForm from "./PayoutRequestForm"

export default async function WalletPayoutPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [walletRes, feeConfigRes, payoutAccountsRes, payoutsRes] = user
    ? await Promise.all([
        supabase
          .from("wallets")
          .select("id, available_balance, pending_balance, total_earned, total_withdrawn")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("fee_configs")
          .select("minimum_payout_cop")
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("traveler_payout_accounts")
          .select("id, account_holder_name, bank_name, account_type, account_number, breb_key, is_default")
          .eq("traveler_user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: true }),
        supabase
          .from("payouts")
          .select("id, payout_code, amount, status, requested_at, reviewed_at, review_notes")
          .eq("traveler_user_id", user.id)
          .order("requested_at", { ascending: false })
          .limit(12),
      ])
    : [
        { data: null },
        { data: null },
        { data: [] },
        { data: [] },
      ]

  const minimumPayout = Number(feeConfigRes.data?.minimum_payout_cop ?? 10000)
  const reservedAmount = getOpenPayoutAmount(payoutsRes.data ?? [])
  const withdrawableBalance = Math.max(Number(walletRes.data?.available_balance ?? 0) - reservedAmount, 0)

  return (
    <>
      <AppNavbar />
      <main className="min-h-screen bg-[#EEF2F7] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <PayoutRequestForm
            payoutAccounts={payoutAccountsRes.data ?? []}
            payouts={payoutsRes.data ?? []}
            minimumPayout={minimumPayout}
            withdrawableBalance={withdrawableBalance}
          />
        </div>
      </main>
    </>
  )
}
