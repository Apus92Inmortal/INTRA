"use client"

import { Camera, FileWarning, ImageIcon, PackageCheck, ShieldAlert, Truck } from "lucide-react"
import { EvidenceImagePreview } from "@/components/evidence-image-preview"
import { formatDateTime } from "@/lib/payments/wallet"

export type AdminCaseEvidenceType =
  | "customer_initial_photo"
  | "pickup_photo"
  | "delivery_photo"
  | "suspicious_photo"

export type AdminCaseEvidence = {
  evidenceType: AdminCaseEvidenceType
  signedUrl: string | null
  note: string | null
  uploadedByName: string
  createdAt: string | null
}

export type AdminCaseFile = {
  matchId: string | null
  shipmentId: string | null
  routeLabel: string
  customerName: string
  travelerName: string
  matchStatus: string | null
  shipmentStatus: string | null
  paymentStatus: string | null
  alertState: "open" | "reviewing" | "resolved" | null
  disputeState: "open" | "reviewing" | "resolved" | null
  evidences: AdminCaseEvidence[]
}

type EvidenceMeta = {
  title: string
  eyebrow: string
  emptyText: string
}

const EVIDENCE_ORDER: AdminCaseEvidenceType[] = [
  "customer_initial_photo",
  "pickup_photo",
  "suspicious_photo",
  "delivery_photo",
]

const EVIDENCE_META: Record<AdminCaseEvidenceType, EvidenceMeta> = {
  customer_initial_photo: {
    title: "Foto inicial",
    eyebrow: "Cliente",
    emptyText: "Sin foto inicial",
  },
  pickup_photo: {
    title: "Recogida",
    eyebrow: "Viajero",
    emptyText: "Sin recogida",
  },
  suspicious_photo: {
    title: "Sospechosa",
    eyebrow: "Alerta",
    emptyText: "Sin alerta visual",
  },
  delivery_photo: {
    title: "Entrega",
    eyebrow: "Viajero",
    emptyText: "Sin entrega",
  },
}

function shortId(value: string | null) {
  return value ? value.slice(0, 8) : "sin dato"
}

function getStateLabel(value: string | null) {
  if (!value) {
    return "Sin dato"
  }

  switch (value) {
    case "open":
      return "Abierta"
    case "reviewing":
      return "En revisión"
    case "resolved":
      return "Resuelto"
    case "none":
      return "Sin disputa"
    default:
      return value.replaceAll("_", " ")
  }
}

function stateClasses(value: string | null) {
  switch (value) {
    case "open":
      return "border-intra-warning-border bg-intra-warning-soft text-intra-warning-text"
    case "reviewing":
      return "border-intra-warning-border bg-intra-warning-soft-alt text-intra-warning-text-strong"
    case "resolved":
      return "border-intra-success-border bg-intra-success-soft text-intra-text-success"
    case "cancelled":
    case "failed":
    case "refunded":
      return "border-intra-danger-border bg-intra-danger-soft text-intra-danger"
    default:
      return "border-intra-border-soft bg-intra-card text-intra-text-subtle"
  }
}

function EvidenceIcon({ type }: { type: AdminCaseEvidenceType }) {
  if (type === "delivery_photo") {
    return <Truck className="h-4 w-4" strokeWidth={2} />
  }

  if (type === "pickup_photo") {
    return <PackageCheck className="h-4 w-4" strokeWidth={2} />
  }

  if (type === "suspicious_photo") {
    return <ShieldAlert className="h-4 w-4" strokeWidth={2} />
  }

  return <Camera className="h-4 w-4" strokeWidth={2} />
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-intra-bg-app px-4 py-3">
      <p className="text-[11px] font-semibold uppercase text-intra-text-muted/70">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-intra-blue">{value}</p>
    </div>
  )
}

function EvidenceTile({
  type,
  evidence,
}: {
  type: AdminCaseEvidenceType
  evidence: AdminCaseEvidence | null
}) {
  const meta = EVIDENCE_META[type]

  if (!evidence) {
    return (
      <div className="min-h-[190px] rounded-2xl border border-dashed border-intra-border-soft bg-intra-neutral-soft-alt p-3">
        <div className="flex h-24 items-center justify-center rounded-xl border border-intra-border bg-intra-card text-intra-text-muted">
          <ImageIcon className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase text-intra-text-muted">{meta.eyebrow}</p>
        <p className="mt-1 text-sm font-semibold text-intra-blue">{meta.title}</p>
        <p className="mt-1 text-xs text-intra-text-muted">{meta.emptyText}</p>
      </div>
    )
  }

  const image = (
    <div className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-intra-border bg-intra-card text-intra-text-muted">
      {evidence.signedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={evidence.signedUrl}
          alt={`Evidencia ${meta.title.toLowerCase()}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon className="h-6 w-6" strokeWidth={1.8} />
      )}
    </div>
  )

  return (
    <div className="min-h-[190px] rounded-2xl border border-intra-border-soft bg-intra-card p-3">
      <EvidenceImagePreview
        src={evidence.signedUrl}
        alt={`Evidencia ${meta.title.toLowerCase()}`}
        modalTitle={meta.title}
      >
        {image}
      </EvidenceImagePreview>
      <div className="mt-3 flex items-start gap-2">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-intra-info-soft text-intra-info">
          <EvidenceIcon type={type} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-intra-text-muted">{meta.eyebrow}</p>
          <p className="truncate text-sm font-semibold text-intra-blue">{meta.title}</p>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-intra-text-subtle">
        {evidence.note || "Sin descripción adicional."}
      </p>
      <p className="mt-2 text-[11px] leading-4 text-intra-text-muted">
        {evidence.uploadedByName} · {formatDateTime(evidence.createdAt)}
      </p>
    </div>
  )
}

export function AdminCaseEvidencePanel({ caseFile }: { caseFile: AdminCaseFile }) {
  const evidenceByType = new Map(caseFile.evidences.map((evidence) => [evidence.evidenceType, evidence]))

  return (
    <section className="rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase text-intra-text-muted">Expediente operativo</p>
          <h4 className="mt-1 text-base font-semibold text-intra-blue">{caseFile.routeLabel}</h4>
          <p className="mt-1 text-xs leading-5 text-intra-text-muted">
            Match {shortId(caseFile.matchId)} · Envío {shortId(caseFile.shipmentId)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {caseFile.alertState ? (
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${stateClasses(caseFile.alertState)}`}>
              Alerta {getStateLabel(caseFile.alertState).toLowerCase()}
            </span>
          ) : null}
          {caseFile.disputeState ? (
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${stateClasses(caseFile.disputeState)}`}>
              Disputa {getStateLabel(caseFile.disputeState).toLowerCase()}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryItem label="Cliente" value={caseFile.customerName} />
        <SummaryItem label="Viajero" value={caseFile.travelerName} />
        <SummaryItem label="Match" value={getStateLabel(caseFile.matchStatus)} />
        <SummaryItem label="Envío" value={getStateLabel(caseFile.shipmentStatus)} />
        <SummaryItem label="Pago" value={getStateLabel(caseFile.paymentStatus)} />
        <SummaryItem label="Alerta" value={caseFile.alertState ? getStateLabel(caseFile.alertState) : "Sin alerta"} />
        <SummaryItem label="Disputa" value={caseFile.disputeState ? getStateLabel(caseFile.disputeState) : "Sin disputa"} />
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-intra-blue" strokeWidth={2} />
          <h5 className="text-sm font-semibold text-intra-blue">Evidencias</h5>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {EVIDENCE_ORDER.map((type) => (
            <EvidenceTile key={type} type={type} evidence={evidenceByType.get(type) ?? null} />
          ))}
        </div>
      </div>
    </section>
  )
}
