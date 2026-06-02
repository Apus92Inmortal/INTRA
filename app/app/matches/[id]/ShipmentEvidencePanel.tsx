"use client";

import { Camera, ImageIcon, PackageCheck, ShieldAlert, Truck } from "lucide-react";
import { EvidenceImagePreview } from "@/components/evidence-image-preview";
import EvidenceUploader from "./EvidenceUploader";

export type ShipmentEvidenceType =
  | "customer_initial_photo"
  | "pickup_photo"
  | "suspicious_photo"
  | "delivery_photo";

export type ShipmentEvidenceViewItem = {
  evidenceType: ShipmentEvidenceType;
  signedUrl: string | null;
  note: string | null;
  fileName: string | null;
  uploadedByName: string;
  createdAt: string;
};

type ShipmentEvidencePanelProps = {
  shipmentId: string;
  matchId: string;
  travelerId: string;
  initialEvidence: ShipmentEvidenceViewItem | null;
  pickupEvidence: ShipmentEvidenceViewItem | null;
  suspiciousEvidence: ShipmentEvidenceViewItem | null;
  deliveryEvidence: ShipmentEvidenceViewItem | null;
  canUploadPickup: boolean;
  canUploadDelivery: boolean;
  pickupAction: () => Promise<void>;
  deliveryAction: () => Promise<void>;
};

type EvidenceMeta = {
  title: string;
  eyebrow: string;
  description: string;
  emptyText: string;
};

const EVIDENCE_META: Record<ShipmentEvidenceType, EvidenceMeta> = {
  customer_initial_photo: {
    title: "Foto inicial",
    eyebrow: "Antes de recogida",
    description: "Referencia subida por el cliente antes del pago.",
    emptyText: "Aún no hay foto inicial disponible.",
  },
  pickup_photo: {
    title: "Recogida",
    eyebrow: "Después de recoger",
    description: "Estado recibido por el viajero al recoger el paquete.",
    emptyText: "Aún no hay evidencia de recogida.",
  },
  suspicious_photo: {
    title: "Alerta sospechosa",
    eyebrow: "Soporte de alerta",
    description: "Foto vinculada a un reporte de paquete sospechoso o incidente operativo.",
    emptyText: "Aún no hay evidencia de alerta sospechosa.",
  },
  delivery_photo: {
    title: "Entrega",
    eyebrow: "Después de entregar",
    description: "Soporte visual de entrega. No reemplaza la confirmación del cliente.",
    emptyText: "Aún no hay evidencia de entrega.",
  },
};

function formatEvidenceDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPrimaryEvidence(
  initialEvidence: ShipmentEvidenceViewItem | null,
  pickupEvidence: ShipmentEvidenceViewItem | null,
  deliveryEvidence: ShipmentEvidenceViewItem | null
) {
  return deliveryEvidence ?? pickupEvidence ?? initialEvidence;
}

function EvidenceIcon({ type }: { type: ShipmentEvidenceType }) {
  if (type === "delivery_photo") {
    return <Truck className="h-5 w-5" strokeWidth={2} />;
  }

  if (type === "pickup_photo") {
    return <PackageCheck className="h-5 w-5" strokeWidth={2} />;
  }

  if (type === "suspicious_photo") {
    return <ShieldAlert className="h-5 w-5" strokeWidth={2} />;
  }

  return <Camera className="h-5 w-5" strokeWidth={2} />;
}

function EvidenceThumbnail({
  evidence,
  compact = false,
}: {
  evidence: ShipmentEvidenceViewItem;
  compact?: boolean;
}) {
  const meta = EVIDENCE_META[evidence.evidenceType];
  const imageClassName = compact
    ? "h-14 w-14 rounded-xl"
    : "h-32 w-full rounded-2xl sm:h-36";

  const image = (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden border border-intra-border bg-intra-card ${imageClassName}`}>
      {evidence.signedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={evidence.signedUrl}
          alt={`Evidencia ${meta.title.toLowerCase()}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon className="h-6 w-6 text-intra-text-muted" strokeWidth={1.8} />
      )}
    </div>
  );

  return (
    <EvidenceImagePreview
      src={evidence.signedUrl}
      alt={`Evidencia ${meta.title.toLowerCase()}`}
      modalTitle={meta.title}
    >
      {image}
    </EvidenceImagePreview>
  );
}

export default function ShipmentEvidencePanel({
  shipmentId,
  matchId,
  travelerId,
  initialEvidence,
  pickupEvidence,
  suspiciousEvidence,
  deliveryEvidence,
  canUploadPickup,
  canUploadDelivery,
  pickupAction,
  deliveryAction,
}: ShipmentEvidencePanelProps) {
  const primaryEvidence = getPrimaryEvidence(initialEvidence, pickupEvidence, deliveryEvidence);
  const evidenceHistory = [suspiciousEvidence, initialEvidence, pickupEvidence, deliveryEvidence].filter(
    (evidence): evidence is ShipmentEvidenceViewItem =>
      Boolean(evidence) && evidence?.evidenceType !== primaryEvidence?.evidenceType
  );
  const currentMeta = primaryEvidence
    ? EVIDENCE_META[primaryEvidence.evidenceType]
    : EVIDENCE_META.customer_initial_photo;

  return (
    <section className="rounded-2xl border border-intra-border-strong bg-[linear-gradient(180deg,var(--intra-card)_0%,var(--intra-neutral-soft-alt)_100%)] p-5 shadow-sm">
      <div>
        <h2 className="intra-h3">Evidencias del envío</h2>
        <p className="mt-1 text-xs leading-5 text-intra-text-muted">
          Mostramos la evidencia principal según el avance del envío. Las fotos son soporte: no confirman entrega ni liberan pagos automáticamente.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-intra-border bg-intra-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-intra-info-soft text-intra-info">
            {primaryEvidence ? <EvidenceIcon type={primaryEvidence.evidenceType} /> : <Camera className="h-5 w-5" strokeWidth={2} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-intra-info">
              {currentMeta.eyebrow}
            </p>
            <h3 className="mt-1 text-base font-semibold text-intra-blue">{currentMeta.title}</h3>
            <p className="mt-1 text-xs leading-5 text-intra-text-muted">{currentMeta.description}</p>
          </div>
        </div>

        {primaryEvidence ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
            <EvidenceThumbnail evidence={primaryEvidence} />
            <div className="min-w-0 rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt p-3">
              <p className="text-xs font-semibold text-intra-blue">
                {primaryEvidence.signedUrl ? "Evidencia principal disponible" : "Imagen no disponible"}
              </p>
              <p className="mt-1 text-xs leading-5 text-intra-text-muted">
                Subida por {primaryEvidence.uploadedByName} · {formatEvidenceDate(primaryEvidence.createdAt)}
              </p>
              {primaryEvidence.note ? (
                <p className="mt-2 line-clamp-4 text-xs leading-5 text-intra-blue">
                  {primaryEvidence.note}
                </p>
              ) : (
                <p className="mt-2 text-xs leading-5 text-intra-text-muted">
                  Sin descripción adicional.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-intra-border bg-intra-neutral-soft-alt px-4 py-3">
            <p className="text-xs leading-5 text-intra-text-muted">{currentMeta.emptyText}</p>
          </div>
        )}
      </div>

      {evidenceHistory.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-intra-border bg-intra-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-intra-text-muted">
            Historial de soporte
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {evidenceHistory.map((evidence) => {
              const meta = EVIDENCE_META[evidence.evidenceType];

              return (
                <div key={evidence.evidenceType} className="flex items-center gap-3 rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt p-3">
                  <EvidenceThumbnail evidence={evidence} compact />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-intra-blue">{meta.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-intra-text-muted">
                      {formatEvidenceDate(evidence.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {canUploadPickup ? (
          <EvidenceUploader
            shipmentId={shipmentId}
            matchId={matchId}
            expectedUploaderId={travelerId}
            evidenceType="pickup_photo"
            title="Recogí el paquete"
            description="Sube una foto clara del paquete recibido y agrega una descripción corta antes de cambiar el estado a en tránsito."
            triggerLabel="Recogí el paquete"
            submitLabel="Guardar evidencia y marcar recogida"
            completeAction={pickupAction}
          />
        ) : null}

        {canUploadDelivery ? (
          <EvidenceUploader
            shipmentId={shipmentId}
            matchId={matchId}
            expectedUploaderId={travelerId}
            evidenceType="delivery_photo"
            title="Reportar entrega"
            description="Sube una foto de soporte y agrega una descripción corta antes de reportar la entrega. No reemplaza la confirmación del cliente."
            triggerLabel="Reportar entrega"
            submitLabel="Guardar evidencia y reportar entrega"
            completeAction={deliveryAction}
          />
        ) : null}
      </div>
    </section>
  );
}
