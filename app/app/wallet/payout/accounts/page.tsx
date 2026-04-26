import { AppNavbar } from "@/components/app-navbar"
import { createClient } from "@/lib/supabase/server"
import PayoutAccountsManager from "./PayoutAccountsManager"

export default async function WalletPayoutAccountsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: accounts } = user
    ? await supabase
        .from("traveler_payout_accounts")
        .select(
          "id, account_holder_name, document_number, bank_name, account_type, account_number, is_default"
        )
        .eq("traveler_user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
    : { data: [] }

  return (
    <>
      <AppNavbar />
      <main className="min-h-screen bg-[#EEF2F7] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <PayoutAccountsManager accounts={accounts ?? []} />
        </div>
      </main>
    </>
  )
}
