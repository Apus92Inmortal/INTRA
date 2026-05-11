import Link from "next/link"
import type { ReactNode } from "react"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpFromLine,
  Clock,
  Headphones,
  Lock,
  ReceiptText,
  ShieldCheck,
} from "lucide-react"
import { AppNavbar } from "@/components/app-navbar"
import { createClient } from "@/lib/supabase/server"
import {
  formatCop,
  formatDateTime,
  VISIBLE_WALLET_MOVEMENT_TYPES,
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

type MatchTrackingRow = {
  id: string
  shipment: {
    tracking_code: string | null
  } | null
}

function getEntryBadgeClasses(entry: WalletHistoryEntry) {
  if (entry.entry_type === "refund_pending_debit" || entry.entry_type === "refund_available_debit") {
    return {
      wrapper: "border-intra-danger-border bg-intra-danger-soft text-intra-danger",
      icon: <ReceiptText className="h-3.5 w-3.5" />,
      label: "Devuelto",
    }
  }

  const balanceType = entry.balance_type

  if (balanceType === "pending") {
    return {
      wrapper: "border-intra-warning-border bg-intra-warning-soft text-intra-warning-text",
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "En retención",
    }
  }

  return {
    wrapper: "border-intra-success-border bg-intra-success-soft text-intra-text-success",
    icon: <Lock className="h-3.5 w-3.5" />,
    label: "Disponible",
  }
}

function getEntryIcon(entry: WalletHistoryEntry) {
  if (entry.payout_id || entry.entry_type === "payout_paid_debit") {
    return <ArrowUpFromLine className="h-5 w-5" />
  }

  if (entry.balance_type === "pending") {
    return <Clock className="h-5 w-5" />
  }

  return <ReceiptText className="h-5 w-5" />
}

function getEntryTitle(entry: WalletHistoryEntry) {
  switch (entry.entry_type) {
    case "release_available_credit":
      return "Pago por entrega realizada"
    case "refund_pending_debit":
    case "refund_available_debit":
      return "Devolución al cliente"
    case "payout_paid_debit":
      return "Retiro"
    default:
      return entry.description?.trim() || "Movimiento de wallet"
  }
}

function getEntryDetail(entry: WalletHistoryEntry, trackingCode?: string | null) {
  if (entry.payout_id) {
    return null
  }

  switch (entry.entry_type) {
    case "release_available_credit":
      return trackingCode ? `Guía: ${trackingCode}` : "Pago acreditado a tu wallet por una entrega completada."
    case "payout_paid_debit":
      return "Salida de dinero desde tu wallet a tu cuenta registrada."
    case "refund_available_credit":
      return "Devolución abonada a tu wallet por gestión administrativa."
    case "refund_pending_debit":
    case "refund_available_debit":
      return "Ajuste aplicado en tu wallet por una devolución al cliente."
    default:
      return null
  }
}

function getAmountTone(direction: string | null) {
  return direction === "credit" ? "text-intra-text-success" : "text-intra-blue"
}

function getAmountPrefix(direction: string | null) {
  if (direction === "credit") {
    return "+ "
  }

  if (direction === "debit") {
    return "- "
  }

  return ""
}

function getHistorySummary(totalCount: number) {
  if (totalCount === 1) {
    return "1 movimiento"
  }

  return `${totalCount} movimientos`
}

function getEntryDateLabel(value: string | null) {
  return `Fecha: ${formatDateTime(value)}`
}

function getEntryAmountLabel(entry: WalletHistoryEntry) {
  return `${getAmountPrefix(entry.direction)}${formatCop(entry.amount ?? 0)}`
}

function getEntryMetaBadge(entry: WalletHistoryEntry, payoutCodes: Map<string, string | null>) {
  if (!entry.payout_id) {
    return null
  }

  return `Retiro ${payoutCodes.get(entry.payout_id) || entry.payout_id}`
}

function getEntryAssistiveLabel(entry: WalletHistoryEntry) {
  if (entry.direction === "credit") {
    return "Entrada"
  }

  if (entry.direction === "debit") {
    return "Salida"
  }

  return "Movimiento"
}

function getEntryIconWrapperClass(entry: WalletHistoryEntry) {
  if (entry.payout_id || entry.entry_type === "payout_paid_debit") {
    return "bg-intra-info-soft text-intra-info"
  }

  if (entry.balance_type === "pending") {
    return "bg-intra-warning-soft text-intra-warning-text"
  }

  return "bg-intra-success-soft text-intra-text-success"
}

function WalletHeroAction({ href, children, variant = "secondary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" }) {
  const className =
    variant === "primary"
      ? "bg-intra-green text-intra-card hover:bg-intra-green-hover"
      : "bg-intra-card text-intra-blue hover:bg-intra-bg-app"

  return (
    <Link
      href={href}
      className={`intra-btn flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 py-3 text-[15px] font-bold ${className}`}
    >
      {children}
    </Link>
  )
}

function WalletHistoryEmptyState() {
  return (
    <div className="mt-7 flex flex-col items-center rounded-[20px] border border-dashed border-intra-border-soft bg-intra-bg-app px-6 py-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-intra-card text-intra-text-muted shadow-sm">
        <ReceiptText className="h-6 w-6" />
      </div>
      <p className="mt-4 text-base font-semibold text-intra-blue">Aún no hay movimientos</p>
      <p className="mt-2 max-w-sm text-sm text-intra-text-subtle">
        Cuando tengas movimientos en tu wallet, aparecerán aquí.
      </p>
    </div>
  )
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
        .in("entry_type", [...VISIBLE_WALLET_MOVEMENT_TYPES])
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

  const matchIds = Array.from(new Set(history.map((entry) => entry.match_id).filter(Boolean))) as string[]

  const matchTrackingRes = user && matchIds.length
    ? await supabase
        .from("matches")
        .select(`
          id,
          shipment:shipments!matches_shipment_id_fkey (
            tracking_code
          )
        `)
        .in("id", matchIds)
    : { data: [] as MatchTrackingRow[] }

  const trackingCodes = new Map(
    ((matchTrackingRes.data ?? []) as MatchTrackingRow[]).map((match) => [match.id, match.shipment?.tracking_code ?? null])
  )

  return (
    <>
      <AppNavbar />
      <main className="intra-page-shell px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
          <section className="relative overflow-hidden rounded-[24px] bg-intra-blue px-5 py-5 text-intra-card shadow-[var(--intra-shadow-base)] sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-30">
              <div className="absolute right-24 top-[-140px] h-80 w-80 rounded-full border border-intra-card/20" />
              <div className="absolute right-8 top-[-90px] h-96 w-96 rounded-full border border-intra-card/10" />
              <div className="absolute bottom-[-140px] right-[-60px] h-80 w-80 rounded-full bg-intra-green/10 blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-intra-card/10 ring-1 ring-intra-card/15 sm:h-16 sm:w-16">
                  <ReceiptText className="h-6 w-6 text-intra-card sm:h-7 sm:w-7" />
                </div>

                <div>
                  <h1 className="text-[28px] font-extrabold leading-[34px] tracking-tight text-intra-card sm:text-[28px] sm:leading-[34px]">
                    Historial de wallet
                  </h1>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-intra-card/85 sm:text-[18px]">
                    Aquí ves todos los movimientos asociados a tu wallet.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
                <WalletHeroAction href="/app/wallet">
                  <ArrowLeft className="h-4 w-4" />
                  Volver a wallet
                </WalletHeroAction>
                <WalletHeroAction href="/app/wallet/payout" variant="primary">
                  <ArrowUpFromLine className="h-4 w-4" />
                  Solicitar retiro
                </WalletHeroAction>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-intra-border-soft bg-intra-card p-4 shadow-[0_16px_50px_rgba(11,44,74,.06)] sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-intra-bg-app text-intra-blue">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[22px] font-bold leading-tight text-intra-blue">Movimientos</h2>
                  <p className="mt-1 text-[15px] text-intra-text-subtle">
                    {getHistorySummary(totalCount)} · Página {currentPage} de {totalPages}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
                <span className="inline-flex min-h-11 items-center justify-center rounded-full bg-intra-success-soft px-4 py-2 text-[14px] font-bold text-intra-text-success">
                  {getHistorySummary(totalCount)}
                </span>
              </div>
            </div>

            {history.length === 0 ? (
              <WalletHistoryEmptyState />
            ) : (
              <>
                <div className="mt-7 hidden overflow-hidden rounded-[20px] border border-intra-border-strong bg-intra-card lg:block">
                  <div className="grid grid-cols-[minmax(320px,1.8fr)_0.8fr_0.8fr_1fr] bg-intra-bg-app px-6 py-5 text-[13px] font-extrabold uppercase tracking-wide text-intra-text-subtle">
                    <span>Movimiento</span>
                    <span>Estado</span>
                    <span>Monto</span>
                    <span>Fecha</span>
                  </div>

                  <div className="divide-y divide-intra-border-soft">
                    {history.map((entry) => {
                      const badge = getEntryBadgeClasses(entry)
                      const detail = getEntryDetail(entry, entry.match_id ? trackingCodes.get(entry.match_id) : null)
                      const metaBadge = getEntryMetaBadge(entry, payoutCodes)

                      return (
                        <div
                          key={entry.id}
                          className="grid grid-cols-[minmax(320px,1.8fr)_0.8fr_0.8fr_1fr] items-center px-6 py-7"
                        >
                          <div className="flex min-w-0 items-start gap-4 pr-4">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getEntryIconWrapperClass(entry)}`}>
                              {getEntryIcon(entry)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[15px] font-bold text-intra-blue">
                                {getEntryTitle(entry)}
                              </p>
                              {detail ? (
                                <p className="mt-2 text-sm text-intra-text-subtle">{detail}</p>
                              ) : null}
                              {metaBadge ? (
                                <span className="mt-3 inline-flex rounded-full bg-intra-bg-app px-3 py-1 text-xs font-semibold text-intra-text-subtle">
                                  {metaBadge}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="pr-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${badge.wrapper}`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                          </div>

                          <div className={`pr-3 text-[16px] font-extrabold ${getAmountTone(entry.direction)}`} aria-label={getEntryAssistiveLabel(entry)}>
                            {getEntryAmountLabel(entry)}
                          </div>

                          <div className="text-[15px] font-medium text-intra-text-subtle">
                            {getEntryDateLabel(entry.created_at)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-7 grid gap-4 lg:hidden">
                  {history.map((entry) => {
                    const badge = getEntryBadgeClasses(entry)
                    const detail = getEntryDetail(entry, entry.match_id ? trackingCodes.get(entry.match_id) : null)
                    const metaBadge = getEntryMetaBadge(entry, payoutCodes)

                    return (
                      <article
                        key={entry.id}
                        className="rounded-[20px] border border-intra-border-soft bg-intra-card p-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${getEntryIconWrapperClass(entry)}`}>
                            {getEntryIcon(entry)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[15px] font-bold text-intra-blue">
                              {getEntryTitle(entry)}
                            </p>
                            {detail ? <p className="mt-1 text-sm text-intra-text-subtle">{detail}</p> : null}
                            <p className="mt-2 text-sm text-intra-text-subtle">{getEntryDateLabel(entry.created_at)}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${badge.wrapper}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                          <p className={`text-[16px] font-extrabold ${getAmountTone(entry.direction)}`} aria-label={getEntryAssistiveLabel(entry)}>
                            {getEntryAmountLabel(entry)}
                          </p>
                        </div>

                        {metaBadge ? (
                          <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-intra-text-muted">
                            <span className="rounded-full bg-intra-bg-app px-3 py-1.5">
                              {metaBadge}
                            </span>
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                </div>
              </>
            )}

            <div className="mt-6 flex flex-col gap-4 border-t border-intra-border-soft pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[15px] text-intra-text-subtle">
                Mostrando {history.length === 0 ? 0 : from + 1} a {Math.min(from + history.length, totalCount)} de {totalCount}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={currentPage > 1 ? `/app/wallet/history?page=${currentPage - 1}` : "/app/wallet/history?page=1"}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-[14px] font-bold transition ${
                    currentPage > 1
                      ? "border border-intra-border-soft text-intra-blue hover:bg-intra-bg-app"
                      : "cursor-not-allowed border border-intra-border-soft text-intra-text-muted/70"
                  }`}
                  aria-disabled={currentPage <= 1}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Anterior
                </Link>

                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-intra-green bg-intra-success-soft text-[15px] font-extrabold text-intra-text-success">
                  {currentPage}
                </span>

                <Link
                  href={`/app/wallet/history?page=${Math.min(currentPage + 1, totalPages)}`}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-5 text-[14px] font-bold transition ${
                    currentPage < totalPages
                      ? "border border-intra-border-soft text-intra-blue hover:bg-intra-bg-app"
                      : "cursor-not-allowed border border-intra-border-soft text-intra-text-muted/70"
                  }`}
                  aria-disabled={currentPage >= totalPages}
                >
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-intra-success-border bg-intra-success-soft p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-intra-green/15 text-intra-text-success">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-intra-text-success">Tu seguridad es nuestra prioridad</h3>
                  <p className="mt-1 text-[15px] text-intra-text-subtle">
                    Todos los movimientos de tu wallet quedan registrados y protegidos para darte visibilidad total sobre cada operación.
                  </p>
                </div>
              </div>

              <Link
                href="/app"
                className="intra-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-intra-green/30 bg-intra-card px-5 py-3 text-[14px] font-bold text-intra-text-success hover:bg-intra-success-soft-alt"
              >
                <Headphones className="h-4 w-4" />
                Centro de ayuda
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
