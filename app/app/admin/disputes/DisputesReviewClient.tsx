"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  reviewDisputeAction,
  reviewShipmentAlertAction,
} from "@/app/app/admin/actions"
import {
  AdminEmptyState,
  AdminFeedback,
  AdminInboxTabs,
  AdminMetricCard,
} from "@/app/app/admin/AdminUi"
import { IntraConfirmDialog } from "@/components/ui"
import { formatCop, formatDateTime } from "@/lib/payments/wallet"
import {
  AdminCaseEvidencePanel,
  type AdminCaseFile,
} from "./AdminCaseEvidencePanel"

type AdminDispute = {
  id: string
  paymentId: string
  matchId: string | null
  shipmentId: string | null
  trackingCode: string | null
  reporterName: string
  reporterUserId: string | null
  affectedName: string
  affectedUserId: string | null
  reason: string
  state: "open" | "reviewing" | "resolved"
  createdAt: string | null
  resolvedAt: string | null
  paymentStatus: string | null
  resolutionAction: string | null
  resolutionNotes: string | null
  suggestedAmount: number
  travelerAmount: number
  caseFile: AdminCaseFile
}

type AdminAlert = {
  id: string
  reportType: string
  shipmentId: string
  matchId: string | null
  trackingCode: string | null
  reporterName: string
  reporterUserId: string
  affectedName: string
  affectedUserId: string | null
  reason: string
  state: "open" | "reviewing" | "resolved"
  createdAt: string | null
  resolvedAt: string | null
  resolutionAction: string | null
  resolutionNotes: string | null
  caseFile: AdminCaseFile
}

type CaseFilter = "open" | "resolved"

type Feedback = { type: "success" | "error"; message: string } | null

function getCaseStateLabel(state: "open" | "reviewing" | "resolved") {
  switch (state) {
    case "reviewing":
      return "En revisión"
    case "resolved":
      return "Resuelta"
    default:
      return "Abierta"
  }
}

function getCaseStateClasses(state: "open" | "reviewing" | "resolved") {
  switch (state) {
    case "reviewing":
      return "border-intra-border-soft bg-intra-info-soft text-intra-info"
    case "resolved":
      return "border-intra-success-border bg-intra-success-soft text-intra-text-success"
    default:
      return "border-intra-warning-border bg-intra-warning-soft text-intra-warning-text"
  }
}

function getReportTypeLabel(reportType: string) {
  switch (reportType) {
    case "suspicious_package":
      return "Paquete sospechoso"
    case "incident":
      return "Incidente en la recogida"
    default:
      return "Otro"
  }
}

function getResolutionLabel(action: string | null) {
  switch (action) {
    case "customer_refund":
      return "A favor del cliente"
    case "traveler_release":
      return "A favor del viajero"
    case "rejected":
      return "Cerrada sin movimiento"
    case "allow_shipment":
      return "Permitir"
    case "reject_shipment":
      return "Rechazar"
    case "escalate_to_dispute":
      return "Escalada a disputa"
    case "reprogram":
      return "Reprogramada"
    case "cancel_match":
      return "Match cancelado"
    case "dismiss":
      return "Descartada"
    default:
      return "Sin resolución"
  }
}

function matchesSearch(item: AdminDispute | AdminAlert, search: string) {
  if (!search) {
    return true
  }

  const haystack = [
    item.trackingCode ?? "",
    item.reporterName,
    item.affectedName,
    item.reason,
    item.caseFile.routeLabel,
    item.caseFile.matchStatus ?? "",
    item.caseFile.shipmentStatus ?? "",
    item.caseFile.paymentStatus ?? "",
    "paymentId" in item ? item.paymentId : item.reportType,
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(search.toLowerCase())
}

function filterByState<T extends AdminDispute | AdminAlert>(
  items: T[],
  filter: CaseFilter,
  search: string,
) {
  return items.filter((item) => {
    if (!matchesSearch(item, search)) {
      return false
    }

    return filter === "open"
      ? item.state !== "resolved"
      : item.state === "resolved"
  })
}

function DisputeCard({
  dispute,
  isPending,
  notes,
  refundAmount,
  onNotesChange,
  onRefundAmountChange,
  onAction,
}: {
  dispute: AdminDispute
  isPending: boolean
  notes: string
  refundAmount: string
  onNotesChange: (value: string) => void
  onRefundAmountChange: (value: string) => void
  onAction: (
    dispute: AdminDispute,
    action: "reviewing" | "customer_refund" | "traveler_release" | "rejected",
  ) => void
}) {
  const isResolved = dispute.state === "resolved"

  return (
    <details className="intra-card rounded-3xl border border-intra-border-soft p-5 shadow-sm">
      <summary className="list-none cursor-pointer">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="intra-h4 text-intra-blue">
                Disputa ·{" "}
                {dispute.trackingCode
                  ? `Guía ${dispute.trackingCode}`
                  : dispute.paymentId}
              </h3>
              <span
                className={`inline-flex rounded-full border px-3 py-1 intra-caption-strong ${getCaseStateClasses(dispute.state)}`}
              >
                {getCaseStateLabel(dispute.state)}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 intra-body text-intra-text-subtle">
              <span>Reportó: {dispute.reporterName}</span>
              <span>Afectado: {dispute.affectedName}</span>
              <span>Abierta: {formatDateTime(dispute.createdAt)}</span>
            </div>
          </div>

          <span className="intra-body-strong text-intra-text-muted/70">
            Ver detalle
          </span>
        </div>
      </summary>

      <div className="mt-5 space-y-4 border-t border-intra-border-soft pt-5">
        <AdminCaseEvidencePanel caseFile={dispute.caseFile} />

        <div>
          <p className="intra-caption-strong uppercase text-intra-text-muted">
            Disputa
          </p>
          <div className="mt-2 rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt px-4 py-3 intra-body text-intra-text-subtle">
            <span className=" text-intra-blue">Motivo:</span> {dispute.reason}
          </div>
        </div>

        <div className="grid gap-3 intra-body text-intra-text-subtle sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
              Pago retenido
            </p>
            <p className="mt-1 text-intra-blue">
              {formatCop(dispute.suggestedAmount)}
            </p>
          </div>
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
              Pago viajero
            </p>
            <p className="mt-1 text-intra-blue">
              {formatCop(dispute.travelerAmount)}
            </p>
          </div>
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
              Estado pago
            </p>
            <p className="mt-1 text-intra-blue">
              {dispute.paymentStatus || "Sin estado"}
            </p>
          </div>
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
              Resolución
            </p>
            <p className="mt-1 text-intra-blue">
              {getResolutionLabel(dispute.resolutionAction)}
            </p>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="intra-body-strong text-intra-blue">
            Notas de resolución
          </span>
          <textarea
            rows={3}
            value={notes}
            readOnly={isResolved}
            onChange={(event) => onNotesChange(event.target.value)}
            className="intra-input min-h-[88px] w-full px-4 py-3 intra-body"
            placeholder="Nota"
          />
        </label>

        {!isResolved ? (
          <label className="block space-y-2">
            <span className="intra-body-strong text-intra-blue">
              Monto devolución manual
            </span>
            <input
              value={refundAmount}
              onChange={(event) => onRefundAmountChange(event.target.value)}
              className="intra-input min-h-11 w-full px-4 py-3 intra-body"
              placeholder={Math.max(dispute.suggestedAmount, 0).toLocaleString("es-CO")}
            />
          </label>
        ) : null}

        {dispute.resolutionNotes ? (
          <div className="rounded-2xl border border-intra-border-soft bg-intra-card px-4 py-3 intra-body text-intra-text-subtle">
            <span className=" text-intra-blue">Última nota:</span>{" "}
            {dispute.resolutionNotes}
          </div>
        ) : null}

        {!isResolved ? (
          <div className="space-y-3 rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-4 py-3">
            <p className="intra-body-strong text-intra-warning-text">
              Acciones
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={isPending}
                onClick={() => onAction(dispute, "reviewing")}
                className="intra-btn intra-btn-secondary min-h-11 px-4 py-2.5 intra-body disabled:opacity-50"
              >
                En revisión
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onAction(dispute, "customer_refund")}
                className="intra-btn intra-btn-primary min-h-11 px-4 py-2.5 intra-body disabled:opacity-50"
              >
                A favor del cliente
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onAction(dispute, "traveler_release")}
                className="intra-btn min-h-11 rounded-2xl border border-intra-success-border bg-intra-card px-4 py-2.5 intra-body-strong text-intra-text-success transition hover:bg-intra-success-soft disabled:opacity-50"
              >
                A favor del viajero
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => onAction(dispute, "rejected")}
                className="intra-btn min-h-11 rounded-2xl border border-intra-border-soft bg-intra-card px-4 py-2.5 intra-body-strong text-intra-text-subtle transition hover:border-intra-blue disabled:opacity-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </details>
  )
}

function AlertCard({
  alert,
  isPending,
  notes,
  onNotesChange,
  onAction,
}: {
  alert: AdminAlert
  isPending: boolean
  notes: string
  onNotesChange: (value: string) => void
  onAction: (alert: AdminAlert, action: string) => void
}) {
  const isResolved = alert.state === "resolved"
  const actionButtons =
    alert.reportType === "suspicious_package"
      ? [
          { key: "reviewing", label: "En revisión" },
          { key: "allow_shipment", label: "Permitir" },
          { key: "reject_shipment", label: "Rechazar" },
          { key: "escalate_to_dispute", label: "Escalar" },
        ]
      : alert.reportType === "incident"
        ? [
            { key: "reviewing", label: "En revisión" },
            { key: "reprogram", label: "Reprogramar" },
            { key: "cancel_match", label: "Cancelar" },
            { key: "dismiss", label: "Descartar" },
          ]
        : [
            { key: "reviewing", label: "En revisión" },
            { key: "escalate_to_dispute", label: "Escalar" },
            { key: "cancel_match", label: "Cancelar" },
            { key: "dismiss", label: "Descartar" },
          ]

  return (
    <details className="intra-card rounded-3xl border border-intra-border-soft p-5 shadow-sm">
      <summary className="list-none cursor-pointer">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="intra-h4 text-intra-blue">
                {getReportTypeLabel(alert.reportType)}
                {alert.trackingCode ? ` · Guía ${alert.trackingCode}` : ""}
              </h3>
              <span
                className={`inline-flex rounded-full border px-3 py-1 intra-caption-strong ${getCaseStateClasses(alert.state)}`}
              >
                {getCaseStateLabel(alert.state)}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 intra-body text-intra-text-subtle">
              <span>Reportó: {alert.reporterName}</span>
              <span>Afectado: {alert.affectedName}</span>
              <span>Creada: {formatDateTime(alert.createdAt)}</span>
            </div>
          </div>

          <span className="intra-body-strong text-intra-text-muted/70">
            Ver detalle
          </span>
        </div>
      </summary>

      <div className="mt-5 space-y-4 border-t border-intra-border-soft pt-5">
        <AdminCaseEvidencePanel caseFile={alert.caseFile} />

        <div>
          <p className="intra-caption-strong uppercase text-intra-text-muted">
            Alerta
          </p>
          <div className="mt-2 rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt px-4 py-3 intra-body text-intra-text-subtle">
            <span className=" text-intra-blue">Motivo:</span> {alert.reason}
          </div>
        </div>

        <div className="grid gap-3 intra-body text-intra-text-subtle sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
              Tipo
            </p>
            <p className="mt-1 text-intra-blue">
              {getReportTypeLabel(alert.reportType)}
            </p>
          </div>
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
              Resolución
            </p>
            <p className="mt-1 text-intra-blue">
              {getResolutionLabel(alert.resolutionAction)}
            </p>
          </div>
          <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
            <p className="intra-caption-strong uppercase tracking-wide text-intra-text-muted/70">
              Actualizada
            </p>
            <p className="mt-1 text-intra-blue">
              {formatDateTime(alert.resolvedAt || alert.createdAt)}
            </p>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="intra-body-strong text-intra-blue">
            Notas de resolución
          </span>
          <textarea
            rows={3}
            value={notes}
            readOnly={isResolved}
            onChange={(event) => onNotesChange(event.target.value)}
            className="intra-input min-h-[88px] w-full px-4 py-3 intra-body"
            placeholder="Nota"
          />
        </label>

        {alert.resolutionNotes ? (
          <div className="rounded-2xl border border-intra-border-soft bg-intra-card px-4 py-3 intra-body text-intra-text-subtle">
            <span className=" text-intra-blue">Última nota:</span>{" "}
            {alert.resolutionNotes}
          </div>
        ) : null}

        {!isResolved ? (
          <div className="space-y-3 rounded-2xl border border-intra-warning-border bg-intra-warning-soft px-4 py-3">
            <p className="intra-body-strong text-intra-warning-text">
              Acciones
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {actionButtons.map((button) => (
                <button
                  key={button.key}
                  type="button"
                  disabled={isPending}
                  onClick={() => onAction(alert, button.key)}
                  className={`intra-btn min-h-11 px-4 py-2.5 intra-body disabled:opacity-50 ${
                    button.key === "reviewing"
                      ? "intra-btn-secondary"
                      : button.key === "reject_shipment" ||
                          button.key === "cancel_match"
                        ? "border border-intra-danger-border text-intra-danger hover:bg-intra-danger-soft"
                        : button.key === "allow_shipment"
                          ? "border border-intra-success-border text-intra-text-success hover:bg-intra-success-soft"
                          : "border border-intra-border-soft text-intra-text-subtle hover:border-intra-blue"
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </details>
  )
}

export default function DisputesReviewClient({
  disputes,
  alerts,
  scope = "all",
}: {
  disputes: AdminDispute[]
  alerts: AdminAlert[]
  scope?: "all" | "disputes" | "alerts"
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [search, setSearch] = useState("")
  const [caseFilter, setCaseFilter] = useState<CaseFilter>("open")
  const [notesByKey, setNotesByKey] = useState<Record<string, string>>({})
  const [refundByPaymentId, setRefundByPaymentId] = useState<
    Record<string, string>
  >({})
  const [confirmAction, setConfirmAction] = useState<{
    type: "dispute" | "alert"
    item: AdminDispute | AdminAlert
    action: string
  } | null>(null)

  const filteredDisputes = useMemo(
    () => filterByState(disputes, caseFilter, search),
    [caseFilter, disputes, search],
  )
  const filteredAlerts = useMemo(
    () => filterByState(alerts, caseFilter, search),
    [alerts, caseFilter, search],
  )

  const counters = useMemo(
    () => ({
      openDisputes: disputes.filter((item) => item.state !== "resolved").length,
      resolvedDisputes: disputes.filter((item) => item.state === "resolved")
        .length,
      openAlerts: alerts.filter((item) => item.state !== "resolved").length,
      resolvedAlerts: alerts.filter((item) => item.state === "resolved").length,
    }),
    [alerts, disputes],
  )
  const showDisputes = scope !== "alerts"
  const showAlerts = scope !== "disputes"
  const openTabLabel = scope === "alerts" ? "Activas" : "Abiertas"
  const activeSectionLabel =
    caseFilter === "open" ? openTabLabel : "Resueltas"
  const emptyDisputesText =
    search.trim().length > 0
      ? "Sin resultados."
      : caseFilter === "open"
        ? "Sin abiertas."
        : "Sin resueltas."
  const emptyAlertsText =
    search.trim().length > 0
      ? "Sin resultados."
      : caseFilter === "open"
        ? "Sin alertas activas."
        : "Sin resueltas."
  const inboxTabs = useMemo(
    () => [
      {
        key: "open",
        label: openTabLabel,
        count:
          scope === "alerts"
            ? counters.openAlerts
            : scope === "disputes"
              ? counters.openDisputes
              : counters.openDisputes + counters.openAlerts,
      },
      {
        key: "resolved",
        label: "Resueltas",
        count:
          scope === "alerts"
            ? counters.resolvedAlerts
            : scope === "disputes"
              ? counters.resolvedDisputes
              : counters.resolvedDisputes + counters.resolvedAlerts,
      },
    ],
    [
      counters.openAlerts,
      counters.openDisputes,
      counters.resolvedAlerts,
      counters.resolvedDisputes,
      openTabLabel,
      scope,
    ],
  )

  function handleDisputeAction(
    dispute: AdminDispute,
    action: "reviewing" | "customer_refund" | "traveler_release" | "rejected",
    isConfirmed = false,
  ) {
    if (
      !isConfirmed &&
      (action === "customer_refund" ||
        action === "traveler_release" ||
        action === "rejected")
    ) {
      setConfirmAction({ type: "dispute", item: dispute, action })
      return
    }

    if (action === "customer_refund") {
      const rawAmount = (refundByPaymentId[dispute.paymentId] ?? "").trim()
      if (!rawAmount) {
        setFeedback({
          type: "error",
          message: "Monto requerido.",
        })
        return
      }
    }

    setFeedback(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set("paymentId", dispute.paymentId)
      if (dispute.matchId) {
        formData.set("matchId", dispute.matchId)
      }
      formData.set("action", action)
      formData.set(
        "resolutionNotes",
        notesByKey[`dispute:${dispute.paymentId}`] ?? "",
      )
      formData.set("refundAmount", refundByPaymentId[dispute.paymentId] ?? "")

      const result = await reviewDisputeAction(formData)

      if (!result.success) {
        setFeedback({
          type: "error",
          message: "Error al actualizar.",
        })
        return
      }

      setFeedback({
        type: "success",
        message: result.message ?? "Disputa actualizada.",
      })
      router.refresh()
    })
  }

  function handleAlertAction(alert: AdminAlert, action: string, isConfirmed = false) {
    const criticalAlertActions = [
      "allow_shipment",
      "reject_shipment",
      "escalate_to_dispute",
      "reprogram",
      "cancel_match",
      "dismiss",
    ]

    if (!isConfirmed && criticalAlertActions.includes(action)) {
      setConfirmAction({ type: "alert", item: alert, action })
      return
    }

    setFeedback(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set("reportId", alert.id)
      formData.set("action", action)
      formData.set("resolutionNotes", notesByKey[`alert:${alert.id}`] ?? "")

      const result = await reviewShipmentAlertAction(formData)

      if (!result.success) {
        setFeedback({
          type: "error",
          message: "Error al actualizar.",
        })
        return
      }

      setFeedback({
        type: "success",
        message: result.message ?? "Alerta actualizada.",
      })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="intra-card rounded-3xl border border-intra-border-soft p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="intra-h2 text-intra-blue ">
              {scope === "alerts"
                ? "Alertas"
                : scope === "disputes"
                  ? "Disputas"
                  : "Disputas y alertas"}
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {showDisputes ? (
              <>
                <AdminMetricCard
                  label="Abiertas"
                  value={counters.openDisputes}
                />
                <AdminMetricCard
                  label="Resueltas"
                  value={counters.resolvedDisputes}
                />
              </>
            ) : null}
            {showAlerts ? (
              <>
                <AdminMetricCard
                  label={scope === "alerts" ? "Activas" : "Abiertas"}
                  value={counters.openAlerts}
                />
                <AdminMetricCard
                  label="Resueltas"
                  value={counters.resolvedAlerts}
                />
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <AdminInboxTabs
            tabs={inboxTabs}
            activeTab={caseFilter}
            onTabChange={(tab) => setCaseFilter(tab as CaseFilter)}
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="intra-input min-h-11 w-full max-w-md px-4 py-3 intra-body"
            placeholder="Buscar"
          />
        </div>

        {feedback ? (
          <div className="mt-5">
            <AdminFeedback type={feedback.type}>
              {feedback.message}
            </AdminFeedback>
          </div>
        ) : null}
      </section>

      {showDisputes ? (
        <section className="space-y-4">
          <div>
            <h3 className="intra-h3 text-intra-blue">
              {activeSectionLabel}
            </h3>
          </div>

          {filteredDisputes.length === 0 ? (
            <AdminEmptyState>{emptyDisputesText}</AdminEmptyState>
          ) : (
            <div className="space-y-4">
              {filteredDisputes.map((dispute) => (
                <DisputeCard
                  key={dispute.paymentId}
                  dispute={dispute}
                  isPending={isPending}
                  notes={
                    notesByKey[`dispute:${dispute.paymentId}`] ??
                    dispute.resolutionNotes ??
                    ""
                  }
                  refundAmount={refundByPaymentId[dispute.paymentId] ?? ""}
                  onNotesChange={(value) =>
                    setNotesByKey((current) => ({
                      ...current,
                      [`dispute:${dispute.paymentId}`]: value,
                    }))
                  }
                  onRefundAmountChange={(value) =>
                    setRefundByPaymentId((current) => ({
                      ...current,
                      [dispute.paymentId]: value,
                    }))
                  }
                  onAction={handleDisputeAction}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {showAlerts ? (
        <section className="space-y-4">
          <div>
            <h3 className="intra-h3 text-intra-blue">
              {activeSectionLabel}
            </h3>
          </div>

          {filteredAlerts.length === 0 ? (
            <AdminEmptyState>{emptyAlertsText}</AdminEmptyState>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  isPending={isPending}
                  notes={
                    notesByKey[`alert:${alert.id}`] ??
                    alert.resolutionNotes ??
                    ""
                  }
                  onNotesChange={(value) =>
                    setNotesByKey((current) => ({
                      ...current,
                      [`alert:${alert.id}`]: value,
                    }))
                  }
                  onAction={handleAlertAction}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {confirmAction ? (
        <IntraConfirmDialog
          open={!!confirmAction}
          title={
            confirmAction.action === "customer_refund"
              ? "Reembolsar cliente"
              : confirmAction.action === "traveler_release"
                ? "Liberar pago a viajero"
                : confirmAction.action === "rejected" ||
                    confirmAction.action === "dismiss"
                  ? "Cerrar caso"
                  : confirmAction.action === "cancel_match"
                    ? "Cancelar match"
                    : "Confirmar acción"
          }
          description="Confirma que revisaste la evidencia disponible y que deseas aplicar esta resolución. Esta acción puede afectar el cierre del caso."
          confirmLabel="Confirmar acción"
          variant={
            confirmAction.action === "rejected" ||
            confirmAction.action === "cancel_match" ||
            confirmAction.action === "reject_shipment"
              ? "danger"
              : "primary"
          }
          isLoading={isPending}
          onConfirm={() => {
            if (confirmAction.type === "dispute") {
              handleDisputeAction(
                confirmAction.item as AdminDispute,
                confirmAction.action as
                  | "reviewing"
                  | "customer_refund"
                  | "traveler_release"
                  | "rejected",
                true,
              )
            } else {
              handleAlertAction(
                confirmAction.item as AdminAlert,
                confirmAction.action,
                true,
              )
            }
            setConfirmAction(null)
          }}
          onCancel={() => setConfirmAction(null)}
        />
      ) : null}
    </div>
  )
}
