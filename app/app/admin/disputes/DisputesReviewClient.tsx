"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  reviewDisputeAction,
  reviewShipmentAlertAction,
} from "@/app/app/admin/actions"
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

type CaseFilter = "all" | "open" | "resolved"

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
      return "Permitir envío"
    case "reject_shipment":
      return "Rechazar envío"
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

    if (filter === "all") {
      return true
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
            Disputa formal
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
              {dispute.paymentStatus || "Sin dato"}
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
            placeholder="Ej: evidencia revisada y cierre aprobado por administración"
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
              placeholder={`Ej: ${Math.max(dispute.suggestedAmount, 0).toLocaleString("es-CO")}`}
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
              Acciones admin
            </p>
            <p className="intra-caption leading-5 text-intra-warning-text">
              Resolver a favor del cliente o viajero puede afectar pago, wallet
              o liberación según la lógica ya existente. Revisa el expediente
              antes de ejecutar.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={isPending}
                onClick={() => onAction(dispute, "reviewing")}
                className="intra-btn intra-btn-secondary min-h-11 px-4 py-2.5 intra-body disabled:opacity-50"
              >
                Marcar en revisión
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
                Cerrar sin movimiento
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
          { key: "reviewing", label: "Marcar en revisión" },
          { key: "allow_shipment", label: "Permitir envío" },
          { key: "reject_shipment", label: "Rechazar envío" },
          { key: "escalate_to_dispute", label: "Escalar a disputa" },
        ]
      : alert.reportType === "incident"
        ? [
            { key: "reviewing", label: "Marcar en revisión" },
            { key: "reprogram", label: "Reprogramar" },
            { key: "cancel_match", label: "Cancelar match" },
            { key: "dismiss", label: "Descartar" },
          ]
        : [
            { key: "reviewing", label: "Marcar en revisión" },
            { key: "escalate_to_dispute", label: "Escalar a disputa" },
            { key: "cancel_match", label: "Cancelar match" },
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
            Reporte sospechoso / alerta
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
              Última actualización
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
            placeholder="Ej: evidencia revisada y caso escalado según protocolo"
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
              Acciones admin
            </p>
            <p className="intra-caption leading-5 text-intra-warning-text">
              Algunas acciones pueden cancelar el envío, escalar a disputa o
              desbloquear el flujo operativo según la lógica ya existente.
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

  function handleDisputeAction(
    dispute: AdminDispute,
    action: "reviewing" | "customer_refund" | "traveler_release" | "rejected",
  ) {
    if (action === "customer_refund") {
      const rawAmount = (refundByPaymentId[dispute.paymentId] ?? "").trim()
      if (!rawAmount) {
        setFeedback({
          type: "error",
          message:
            "Escribe el monto manual antes de resolver a favor del cliente.",
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
          message: result.error ?? "No pudimos actualizar la disputa.",
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

  function handleAlertAction(alert: AdminAlert, action: string) {
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
          message: result.error ?? "No pudimos actualizar la alerta.",
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
                <div className="rounded-2xl bg-intra-bg-app px-4 py-3 intra-body text-intra-text-subtle">
                  <p className=" text-intra-blue">Abiertas</p>
                  <p className="mt-1 intra-h2 text-intra-blue">
                    {counters.openDisputes}
                  </p>
                </div>
                <div className="rounded-2xl bg-intra-bg-app px-4 py-3 intra-body text-intra-text-subtle">
                  <p className=" text-intra-blue">Resueltas</p>
                  <p className="mt-1 intra-h2 text-intra-blue">
                    {counters.resolvedDisputes}
                  </p>
                </div>
              </>
            ) : null}
            {showAlerts ? (
              <>
                <div className="rounded-2xl bg-intra-bg-app px-4 py-3 intra-body text-intra-text-subtle">
                  <p className=" text-intra-blue">Abiertas</p>
                  <p className="mt-1 intra-h2 text-intra-blue">
                    {counters.openAlerts}
                  </p>
                </div>
                <div className="rounded-2xl bg-intra-bg-app px-4 py-3 intra-body text-intra-text-subtle">
                  <p className=" text-intra-blue">Resueltas</p>
                  <p className="mt-1 intra-h2 text-intra-blue">
                    {counters.resolvedAlerts}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "open", label: "Abiertas / en revisión" },
                { key: "resolved", label: "Resueltas" },
                { key: "all", label: "Todas" },
              ] as Array<{ key: CaseFilter; label: string }>
            ).map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setCaseFilter(filter.key)}
                className={`rounded-2xl border px-4 py-2 intra-body-strong transition ${
                  caseFilter === filter.key
                    ? "border-intra-blue bg-intra-blue text-intra-card"
                    : "border-intra-border-soft bg-intra-card text-intra-text-subtle hover:border-intra-blue hover:text-intra-blue"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="intra-input min-h-11 w-full max-w-md px-4 py-3 intra-body"
            placeholder="Buscar por guía, motivo o usuario"
          />
        </div>

        {feedback ? (
          <div
            className={`mt-5 rounded-2xl px-4 py-3 intra-body ${
              feedback.type === "error"
                ? "border border-intra-danger-border bg-intra-danger-soft text-intra-danger"
                : "border border-intra-success-border bg-intra-success-soft text-intra-text-success"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
      </section>

      {showDisputes ? (
        <section className="space-y-4">
          <div>
            <h3 className="intra-h3 text-intra-blue">Disputas</h3>
          </div>

          {filteredDisputes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-intra-border-soft bg-intra-card px-6 py-6 intra-body text-intra-text-subtle shadow-sm">
              No hay disputas para este filtro.
            </div>
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
            <h3 className="intra-h3 text-intra-blue">Alertas</h3>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-intra-border-soft bg-intra-card px-6 py-6 intra-body text-intra-text-subtle shadow-sm">
              No hay alertas para este filtro.
            </div>
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
    </div>
  )
}
