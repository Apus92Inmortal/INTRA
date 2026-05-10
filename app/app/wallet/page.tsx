import Link from "next/link"
import type { ReactNode } from "react"
import {
  Activity,
  ArrowUpFromLine,
  ChevronRight,
  Clock,
  Inbox,
  Landmark,
  Lock,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react"
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

function WalletEmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-[20px] border border-dashed border-intra-border-soft bg-intra-bg-app px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-intra-card text-intra-text-muted shadow-sm">
        {icon}
      </div>
      <p className="mt-4 text-sm font-semibold text-intra-blue">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-intra-text-subtle">{description}</p>
    </div>
  )
}

function WalletMetricCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode
  label: string
  value: string
  tone?: "default" | "success"
}) {
  const cardClass =
    tone === "success"
      ? "border-intra-success-border bg-intra-success-soft"
      : "border-intra-border-soft bg-intra-card"
  const iconShellClass =
    tone === "success"
      ? "bg-intra-card text-intra-text-success"
      : "bg-intra-bg-app text-intra-text-muted"
  const labelClass = tone === "success" ? "text-intra-text-success" : "text-intra-text-subtle"
  const chevronClass = tone === "success" ? "text-intra-text-success" : "text-intra-text-muted"

  return (
    <div className={`rounded-[24px] border p-5 shadow-sm ${cardClass}`}>
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconShellClass}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${labelClass}`}>{label}</p>
          <p className="mt-1 text-[30px] font-extrabold leading-none tracking-[-0.02em] text-intra-blue">{value}</p>
        </div>
        <ChevronRight className={`h-5 w-5 shrink-0 ${chevronClass}`} />
      </div>
    </div>
  )
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
          .select("id, available_balance, pending_balance, total_earned")
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
    : [{ data: null }, { data: [] }, { data: [] }, { data: [] }]

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
      <main className="intra-page-shell px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="relative overflow-hidden rounded-[24px] bg-intra-blue px-5 py-5 shadow-[var(--intra-shadow-hero)] sm:px-6 sm:py-6">
            <div className="pointer-events-none absolute -right-16 top-0 h-44 w-44 rounded-full bg-intra-card/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-intra-card/10 blur-2xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-intra-card/20 bg-intra-card/10 text-intra-card">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-intra-card/70">INTRA Pay</p>
                    <h1 className="mt-2 text-2xl font-bold text-intra-card sm:text-3xl">Mi wallet</h1>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-intra-card/70 sm:text-[15px]">
                      Gestiona tu saldo disponible, pagos retenidos y retiros desde un solo lugar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
                <Link
                  href="/app/wallet/payout"
                  className="intra-btn flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-intra-card px-5 py-3 text-sm font-semibold text-intra-blue hover:bg-intra-bg-app"
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                  Solicitar retiro
                </Link>
                <Link
                  href="/app/wallet/history"
                  className="intra-btn flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-intra-card/20 px-5 py-3 text-sm font-semibold text-intra-card hover:bg-intra-card/10"
                >
                  <ReceiptText className="h-4 w-4" />
                  Ver historial
                </Link>
              </div>
            </div>
          </section>

          {!hasWallet ? (
            <section className="intra-card rounded-[24px] border-dashed p-6 text-intra-text-subtle sm:p-7">
              <h2 className="intra-h3">Aún no tienes wallet activa</h2>
              <p className="mt-2 max-w-2xl intra-body">
                La wallet se crea cuando recibes tu primer pago seguro asociado a una entrega. Mientras tanto,
                puedes guardar tu cuenta de retiro para tener todo listo.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app/wallet/payout/accounts"
                  className="intra-btn min-h-11 rounded-2xl bg-intra-green px-5 py-3 text-sm font-semibold text-intra-card hover:bg-intra-green-hover"
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

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <WalletMetricCard
              icon={<Wallet className="h-5 w-5" />}
              label="Saldo disponible"
              value={formatCop(wallet?.available_balance ?? 0)}
              tone="success"
            />
            <WalletMetricCard
              icon={<Lock className="h-5 w-5" />}
              label="En retención"
              value={formatCop(wallet?.pending_balance ?? 0)}
            />
            <WalletMetricCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Total ganado"
              value={formatCop(wallet?.total_earned ?? 0)}
            />
          </section>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
            <div className="rounded-[24px] border border-intra-border-soft bg-intra-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-intra-bg-app text-intra-text-subtle">
                    <Activity className="h-5 w-5" />
                  </div>
                  <h2 className="intra-h4">Últimos movimientos</h2>
                </div>
                <Link href="/app/wallet/history" className="intra-link flex items-center gap-1 text-sm font-semibold">
                  Ver todo
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {movementEntries.length === 0 ? (
                <WalletEmptyState
                  icon={<ReceiptText className="h-6 w-6" />}
                  title="Aún no hay movimientos"
                  description="Aún no hay movimientos registrados en tu wallet."
                />
              ) : (
                <div className="mt-4 divide-y divide-intra-border-soft">
                  {movementEntries.map((entry) => (
                    <div key={entry.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-intra-blue">{getLedgerEntryLabel(entry.entry_type, entry.description)}</p>
                        <p className="mt-1 text-sm text-intra-text-muted">{formatDateTime(entry.created_at)}</p>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
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

            <div className="space-y-5">
              <div className="rounded-[24px] border border-intra-border-soft bg-intra-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-intra-success-soft text-intra-text-success">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <h2 className="intra-h4">Retiro rápido</h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-intra-success-border bg-intra-success-soft px-3 py-1 text-xs font-semibold text-intra-text-success">
                    <span className="h-2 w-2 rounded-full bg-intra-green" />
                    Listo para retirar
                  </span>
                </div>

                <p className="mt-4 text-[30px] font-extrabold leading-none tracking-[-0.02em] text-intra-blue">
                  {formatCop(withdrawableBalance)}
                </p>

                <div className="mt-5 space-y-3">
                  <Link
                    href={hasPayoutAccount ? "/app/wallet/payout" : "/app/wallet/payout/accounts"}
                    className="intra-btn flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-intra-green px-5 py-3 text-sm font-bold text-intra-card hover:bg-intra-green-hover"
                  >
                    <Landmark className="h-4 w-4" />
                    {hasPayoutAccount ? "Solicitar retiro" : "Agregar cuenta de retiro"}
                  </Link>

                  <div className="flex items-center gap-2 rounded-xl border border-intra-success-border bg-intra-success-soft px-3 py-2 text-xs font-medium text-intra-text-success">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>Mínimo operativo: retiro desde $10.000 COP.</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-intra-border-soft bg-intra-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-intra-bg-app text-intra-text-subtle">
                      <Clock className="h-5 w-5" />
                    </div>
                    <h2 className="intra-h4">Solicitudes recientes</h2>
                  </div>
                  <Link href="/app/wallet/payout" className="intra-link flex items-center gap-1 text-sm font-semibold">
                    Ver retiros
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {payouts.length === 0 ? (
                  <WalletEmptyState
                    icon={<Inbox className="h-6 w-6" />}
                    title="Sin solicitudes recientes"
                    description="No tienes retiros solicitados todavía."
                  />
                ) : (
                  <div className="mt-4 space-y-3">
                    {payouts.map((payout) => (
                      <article key={payout.id} className="rounded-2xl border border-intra-border-soft p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-intra-blue">{formatCop(payout.amount ?? 0)}</p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-intra-text-muted/70">
                              {payout.payout_code || "Sin referencia"}
                            </p>
                            <p className="mt-1 text-xs text-intra-text-muted">{formatDateTime(payout.requested_at)}</p>
                          </div>
                          <span
                            className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getPayoutStatusClasses(
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
