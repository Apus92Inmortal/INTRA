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

  return (
    <>
      <AppNavbar />
      <main className="min-h-screen bg-[#EEF2F7] px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-3xl bg-[#0B2C4A] p-6 text-white shadow-lg shadow-[#0B2C4A]/10 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm text-white/70">INTRA Pay</p>
                <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Mi wallet</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                  Gestiona tu saldo disponible, pagos en retención temporal y retiros desde un solo lugar.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app/wallet/payout"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#0B2C4A] transition hover:bg-slate-100"
                >
                  Solicitar retiro
                </Link>
                <Link
                  href="/app/wallet/history"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Ver historial
                </Link>
              </div>
            </div>
          </section>

          {!hasWallet ? (
            <section className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-slate-600 shadow-sm sm:p-8">
              <h2 className="text-xl font-semibold text-[#0B2C4A]">Aún no tienes wallet activa</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 sm:text-base">
                La wallet se crea cuando recibes tu primer pago seguro asociado a una entrega. Mientras tanto,
                puedes guardar tu cuenta de retiro para tener todo listo.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app/wallet/payout/accounts"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  Configurar cuenta de retiro
                </Link>
                <Link
                  href="/app/matches"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ir a mis matches
                </Link>
              </div>
            </section>
          ) : null}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-[#A3E4BF] bg-[#EFFBF4] p-5 shadow-sm">
              <p className="text-sm text-[#1e8c4e]">Saldo disponible</p>
              <p className="mt-3 text-3xl font-bold text-[#0B2C4A]">{formatCop(wallet?.available_balance ?? 0)}</p>
              <p className="mt-2 text-xs text-slate-600">Listo para retiro o pago al viajero.</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Saldo pendiente</p>
              <p className="mt-3 text-3xl font-bold text-[#0B2C4A]">{formatCop(wallet?.pending_balance ?? 0)}</p>
              <p className="mt-2 text-xs text-slate-500">Pagos en retención temporal aún no liberados.</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total ganado</p>
              <p className="mt-3 text-3xl font-bold text-[#0B2C4A]">{formatCop(wallet?.total_earned ?? 0)}</p>
              <p className="mt-2 text-xs text-slate-500">Acumulado liberado por entregas completadas.</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total retirado</p>
              <p className="mt-3 text-3xl font-bold text-[#0B2C4A]">{formatCop(wallet?.total_withdrawn ?? 0)}</p>
              <p className="mt-2 text-xs text-slate-500">Valor pagado hacia tus cuentas registradas.</p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#0B2C4A]">Últimos movimientos</h2>
                  <p className="mt-1 text-sm text-slate-500">Tus eventos más recientes de retención temporal y liberación.</p>
                </div>
                <Link href="/app/wallet/history" className="text-sm font-semibold text-[#0B2C4A] hover:underline">
                  Ver todo
                </Link>
              </div>

              {ledger.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  Aún no hay movimientos registrados en tu wallet.
                </div>
              ) : (
                <div className="mt-5 divide-y divide-slate-100">
                  {ledger.map((entry) => (
                    <div key={entry.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-[#0B2C4A]">
                          {getLedgerEntryLabel(entry.entry_type, entry.description)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(entry.created_at)}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p
                          className={`text-base font-semibold ${
                            entry.direction === "credit" ? "text-[#1e8c4e]" : "text-slate-800"
                          }`}
                        >
                          {entry.direction === "credit" ? "+" : "-"}
                          {formatCop(entry.amount ?? 0)}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                          {entry.balance_type === "available" ? "Disponible" : "Pendiente"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#0B2C4A]">Retiro rápido</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Saldo realmente disponible para retiro después de apartar solicitudes abiertas.
                </p>
                <p className="mt-4 text-3xl font-bold text-[#0B2C4A]">{formatCop(withdrawableBalance)}</p>
                <div className="mt-5 flex flex-col gap-3">
                  <Link
                    href={hasPayoutAccount ? "/app/wallet/payout" : "/app/wallet/payout/accounts"}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#0B2C4A] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                  >
                    {hasPayoutAccount ? "Solicitar retiro" : "Agregar cuenta de retiro"}
                  </Link>
                  <p className="text-xs text-slate-500">
                    Mínimo operativo: retiro desde $10.000 COP.
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[#0B2C4A]">Solicitudes recientes</h2>
                  <Link href="/app/wallet/payout" className="text-sm font-semibold text-[#0B2C4A] hover:underline">
                    Ver retiros
                  </Link>
                </div>

                {payouts.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    No tienes retiros solicitados todavía.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {payouts.map((payout) => (
                      <article key={payout.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#0B2C4A]">{formatCop(payout.amount ?? 0)}</p>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              {payout.payout_code || "Sin referencia"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{formatDateTime(payout.requested_at)}</p>
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
