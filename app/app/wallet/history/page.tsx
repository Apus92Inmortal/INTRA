import Link from "next/link"
import { AppNavbar } from "@/components/app-navbar"
import { createClient } from "@/lib/supabase/server"
import {
  formatCop,
  formatDateTime,
  getDirectionLabel,
  getLedgerEntryLabel,
  getLedgerTypeLabel,
} from "@/lib/payments/wallet"

type WalletHistoryPageProps = {
  searchParams?: Promise<{
    page?: string
  }>
}

const PAGE_SIZE = 12

type WalletHistoryEntry = {
  id: string
  entry_type: string | null
  balance_type: string | null
  direction: string | null
  amount: number | null
  description: string | null
  created_at: string | null
  payment_id: string | null
  match_id: string | null
  payout_id: string | null
}

type PayoutCodeRow = {
  id: string
  payout_code: string | null
}

export default async function WalletHistoryPage({ searchParams }: WalletHistoryPageProps) {
  const resolvedSearchParams = await searchParams
  const currentPage = Math.max(Number(resolvedSearchParams?.page ?? "1") || 1, 1)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const historyRes = user
    ? await supabase
        .from("wallet_ledger")
        .select(
          "id, entry_type, balance_type, direction, amount, description, created_at, payment_id, match_id, payout_id",
          { count: "exact" }
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to)
    : { data: [], count: 0 }

  const history = (historyRes.data ?? []) as WalletHistoryEntry[]
  const totalCount = historyRes.count ?? 0
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1)

  const payoutIds = Array.from(new Set(history.map((entry) => entry.payout_id).filter(Boolean))) as string[]

  const payoutCodesRes = user && payoutIds.length
    ? await supabase.from("payouts").select("id, payout_code").in("id", payoutIds)
    : { data: [] as PayoutCodeRow[] }

  const payoutCodes = new Map(
    ((payoutCodesRes.data ?? []) as PayoutCodeRow[]).map((payout) => [payout.id, payout.payout_code])
  )

  return (
    <>
      <AppNavbar />
      <main className="intra-page-shell px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="intra-card p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="intra-page-title text-2xl sm:text-3xl">Historial de wallet</h1>
                <p className="mt-1 intra-body text-intra-text-muted sm:text-base">
                  Todos tus movimientos de saldo disponible y saldo en retención temporal.
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/app/wallet"
                  className="intra-btn intra-btn-secondary min-h-11 rounded-2xl px-4 py-2.5 text-sm font-semibold"
                >
                  Volver a wallet
                </Link>
                <Link
                  href="/app/wallet/payout"
                  className="intra-btn intra-btn-primary min-h-11 rounded-2xl px-4 py-2.5 text-sm font-semibold"
                >
                  Solicitar retiro
                </Link>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-intra-border-soft bg-intra-card shadow-sm">
            <div className="flex items-center justify-between border-b border-intra-border-soft px-6 py-4">
              <div>
                <h2 className="intra-h4">Movimientos</h2>
                <p className="mt-1 text-sm text-intra-text-muted">Página {currentPage} de {totalPages}</p>
              </div>
              <span className="rounded-full bg-intra-bg-app px-3 py-1 text-xs font-semibold text-intra-text-subtle">
                {totalCount} total
              </span>
            </div>

            {history.length === 0 ? (
              <div className="px-6 py-10 text-sm text-intra-text-muted">
                Aún no hay movimientos registrados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-intra-border-soft">
                  <thead className="bg-intra-bg-app">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-intra-text-muted">
                        Movimiento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-intra-text-muted">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-intra-text-muted">
                        Dirección
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-intra-text-muted">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-intra-text-muted">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-intra-border-soft bg-intra-card">
                    {history.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 align-top">
                          <p className="font-medium text-intra-blue">
                            {getLedgerEntryLabel(entry.entry_type, entry.description)}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-intra-text-muted/70">
                            {entry.payment_id ? <span>Pago vinculado</span> : null}
                            {entry.match_id ? <span>Match asociado</span> : null}
                            {entry.payout_id ? <span>Retiro asociado · {payoutCodes.get(entry.payout_id) || entry.payout_id}</span> : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-intra-text-subtle">
                          {getLedgerTypeLabel(entry.balance_type)}
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-intra-text-subtle">
                          {getDirectionLabel(entry.direction)}
                        </td>
                        <td className="px-6 py-4 align-top">
                          <span
                            className={`text-sm font-semibold ${
                              entry.direction === "credit" ? "text-intra-text-success" : "text-intra-blue"
                            }`}
                          >
                            {entry.direction === "credit" ? "+" : "-"}
                            {formatCop(entry.amount ?? 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-intra-text-muted">
                          {formatDateTime(entry.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-intra-border-soft px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-intra-text-muted">
                Mostrando {history.length === 0 ? 0 : from + 1} a {Math.min(from + history.length, totalCount)} de {totalCount}
              </p>
              <div className="flex gap-3">
                <Link
                  href={currentPage > 1 ? `/app/wallet/history?page=${currentPage - 1}` : "/app/wallet/history?page=1"}
                  className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                    currentPage > 1
                      ? "border border-intra-border-soft text-intra-text-subtle hover:bg-intra-bg-app"
                      : "cursor-not-allowed border border-intra-border-soft text-intra-text-muted/70"
                  }`}
                  aria-disabled={currentPage <= 1}
                >
                  Anterior
                </Link>
                <Link
                  href={`/app/wallet/history?page=${Math.min(currentPage + 1, totalPages)}`}
                  className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                    currentPage < totalPages
                      ? "bg-intra-blue text-intra-card hover:bg-intra-blue-hover-card"
                      : "cursor-not-allowed border border-intra-border-soft text-intra-text-muted/70"
                  }`}
                  aria-disabled={currentPage >= totalPages}
                >
                  Siguiente
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
