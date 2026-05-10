import Link from "next/link"
import { AppNavbar } from "@/components/app-navbar"
import { createClient } from "@/lib/supabase/server"
import {
  formatCop,
  formatDateTime,
  getLedgerEntryLabel,
  getOpenPayoutAmount,
  getPayoutStatusClasses,
  getPayoutStatusLabel,
} from "@/lib/payments/wallet"

type WalletRow = {
  id: string
  available_balance: number | null
  pending_balance: number | null
  total_earned: number | null
  total_withdrawn: number | null
}

type LedgerRow = {
  id: string
  entry_type: string | null
  balance_type: string | null
  direction: string | null
  amount: number | null
  description: string | null
  created_at: string | null
}

type PayoutRow = {
  id: string
  payout_code: string | null
  amount: number | null
  status: string | null
  requested_at: string | null
}

export default async function WalletPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [walletRes, ledgerRes, payoutsRes, accountsRes] = user
    ? await Promise.all([
        supabase
          .from("wallets")
          .select("id, available_balance, pending_balance, total_earned, total_withdrawn")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("wallet_ledger")
          .select("id, entry_type, balance_type, direction, amount, description, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("payouts")
          .select("id, payout_code, amount, status, requested_at")
          .eq("traveler_user_id", user.id)
          .order("requested_at", { ascending: false })
          .limit(4),
        supabase
          .from("traveler_payout_accounts")
          .select("id")
          .eq("traveler_user_id", user.id)
          .limit(1),
      ])
    : [
        { data: null },
        { data: [] },
        { data: [] },
        { data: [] },
      ]

  const wallet = (walletRes.data ?? null) as WalletRow | null
  const ledger = (ledgerRes.data ?? []) as LedgerRow[]
  const payouts = (payoutsRes.data ?? []) as PayoutRow[]
  const reservedAmount = getOpenPayoutAmount(payouts)
  const withdrawableBalance = Math.max(Number(wallet?.available_balance ?? 0) - reservedAmount, 0)
  const hasWallet = Boolean(wallet?.id)
  const hasPayoutAccount = (accountsRes.data?.length ?? 0) > 0
  const movementEntries = ledger.filter(
    (entry) => entry.entry_type === "release_available_credit" || entry.entry_type === "payout_paid_debit"
  )

  return (
    <>
      <AppNavbar />
      <main className="intra-page-shell px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="intra-dashboard-revenue-card p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-intra-card/70">INTRA Pay</p>
                <h1 className="mt-2 text-3xl font-bold text-intra-card sm:text-4xl">Mi wallet</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-intra-card/75 sm:text-base">
                  Gestiona tu saldo disponible, pagos en retención temporal y retiros desde un solo lugar.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app/wallet/payout"
                  className="intra-btn min-h-11 rounded-2xl bg-intra-card px-5 py-3 text-sm font-semibold text-intra-blue hover:bg-intra-bg-app"
                >
                  Solicitar retiro
                </Link>
                <Link
                  href="/app/wallet/history"
                  className="intra-btn min-h-11 rounded-2xl border border-intra-card/20 px-5 py-3 text-sm font-semibold text-intra-card hover:bg-intra-card/10"
                >
                  Ver historial
                </Link>
              </div>
            </div>
          </section>

          {!hasWallet ? (
            <section className="intra-card rounded-3xl border-dashed p-6 text-intra-text-subtle sm:p-8">
              <h2 className="intra-h3">Aún no tienes wallet activa</h2>
              <p className="mt-2 max-w-2xl intra-body">
                La wallet se crea cuando recibes tu primer pago seguro asociado a una entrega. Mientras tanto,
                puedes guardar tu cuenta de retiro para tener todo listo.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app/wallet/payout/accounts"
                  className="intra-btn intra-btn-primary min-h-11 rounded-2xl px-5 py-3 text-sm font-semibold"
                >
                  Configurar cuenta de retiro
                </Link>
                <Link
                  href="/app/matches"
                  className="intra-btn intra-btn-secondary min-h-11 rounded-2xl px-5 py-3 text-sm font-semibold"
                >
                  Ir a mis matches
                </Link>
              </div>
            </section>
          ) : null}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-intra-success-border bg-intra-success-soft p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="intra-body-strong text-intra-text-success">Saldo disponible</p>
                <p className="intra-h3">{formatCop(wallet?.available_balance ?? 0)}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-intra-border-soft bg-intra-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="intra-body-strong text-intra-text-subtle">Total ganado</p>
                <p className="intra-h3">{formatCop(wallet?.total_earned ?? 0)}</p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-intra-border-soft bg-intra-card p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="intra-h4">Últimos movimientos</h2>
                </div>
                <Link href="/app/wallet/history" className="intra-link text-sm font-semibold">
                  Ver todo
                </Link>
              </div>

              {movementEntries.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-intra-border-soft bg-intra-bg-app px-4 py-5 text-sm text-intra-text-muted">
                  Aún no hay movimientos registrados en tu wallet.
                </div>
              ) : (
                <div className="mt-5 divide-y divide-intra-border-soft">
                  {movementEntries.map((entry) => (
                    <div key={entry.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-intra-blue">
                          {getLedgerEntryLabel(entry.entry_type, entry.description)}
                        </p>
                        <p className="mt-1 text-sm text-intra-text-muted">{formatDateTime(entry.created_at)}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p
                          className={`text-base font-semibold ${
                            entry.direction === "credit" ? "text-intra-text-success" : "text-intra-blue"
                          }`}
                        >
                          {entry.direction === "credit" ? "+" : "-"}
                          {formatCop(entry.amount ?? 0)}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-intra-text-muted/70">
                          {entry.entry_type === "release_available_credit" ? "Depositado" : "Retirado"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-intra-border-soft bg-intra-card p-6 shadow-sm">
                <h2 className="intra-h4">Retiro rápido</h2>
                <p className="mt-4 text-3xl font-bold text-intra-blue">{formatCop(withdrawableBalance)}</p>
                <div className="mt-5 flex flex-col gap-3">
                  <Link
                    href={hasPayoutAccount ? "/app/wallet/payout" : "/app/wallet/payout/accounts"}
                    className="intra-btn intra-btn-primary min-h-11 rounded-2xl px-5 py-3 text-sm font-semibold"
                  >
                    {hasPayoutAccount ? "Solicitar retiro" : "Agregar cuenta de retiro"}
                  </Link>
                  <p className="text-xs text-intra-text-muted">
                    Mínimo operativo: retiro desde $10.000 COP.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-intra-border-soft bg-intra-card p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="intra-h4">Solicitudes recientes</h2>
                  <Link href="/app/wallet/payout" className="intra-link text-sm font-semibold">
                    Ver retiros
                  </Link>
                </div>

                {payouts.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-intra-border-soft bg-intra-bg-app px-4 py-5 text-sm text-intra-text-muted">
                    No tienes retiros solicitados todavía.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {payouts.map((payout) => (
                      <article key={payout.id} className="rounded-2xl border border-intra-border-soft p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-intra-blue">{formatCop(payout.amount ?? 0)}</p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-intra-text-muted/70">
                              {payout.payout_code || "Sin referencia"}
                            </p>
                            <p className="mt-1 text-xs text-intra-text-muted">{formatDateTime(payout.requested_at)}</p>
                          </div>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPayoutStatusClasses(
                              payout.status
                            )}`}
                          >
                            {getPayoutStatusLabel(payout.status)}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
