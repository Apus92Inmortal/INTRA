"use client";

import { useState } from "react";
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
};

const EVIDENCE_META: Record<ShipmentEvidenceType, EvidenceMeta> = {
  customer_initial_photo: {
    title: "Foto inicial",
  },
  pickup_photo: {
    title: "Recogida",
  },
  suspicious_photo: {
    title: "Alerta sospechosa",
  },
  delivery_photo: {
    title: "Entrega",
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
    : "h-32 w-full rounded-2xl";

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const primaryEvidence = getPrimaryEvidence(initialEvidence, pickupEvidence, deliveryEvidence);
  const evidenceHistory = [suspiciousEvidence, initialEvidence, pickupEvidence, deliveryEvidence].filter(
    (evidence): evidence is ShipmentEvidenceViewItem =>
      Boolean(evidence) && evidence?.evidenceType !== primaryEvidence?.evidenceType
  );
  const currentMeta = primaryEvidence
    ? EVIDENCE_META[primaryEvidence.evidenceType]
    : EVIDENCE_META.customer_initial_photo;

  return (
    <section className="rounded-2xl border border-intra-border-strong bg-intra-card p-5 shadow-sm">
      <h2 className="intra-h3">Evidencia del envío</h2>

      {primaryEvidence ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[148px_minmax(0,1fr)] sm:items-center">
          <EvidenceThumbnail evidence={primaryEvidence} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-intra-info">
              <EvidenceIcon type={primaryEvidence.evidenceType} />
              <p className="intra-body-strong text-intra-blue">{currentMeta.title}</p>
            </div>
            <p className="mt-1 intra-caption text-intra-text-muted">
              Subida por {primaryEvidence.uploadedByName} · {formatEvidenceDate(primaryEvidence.createdAt)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-intra-border bg-intra-neutral-soft-alt px-4 py-4">
          <p className="intra-body text-intra-text-muted">Sin evidencia visible todavía.</p>
        </div>
      )}

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

      {evidenceHistory.length > 0 ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsHistoryOpen((value) => !value)}
            className="inline-flex min-h-10 items-center justify-center rounded-2xl px-2 intra-body-strong text-intra-blue transition hover:bg-intra-neutral-soft-alt"
            aria-expanded={isHistoryOpen}
          >
            {isHistoryOpen ? "Ocultar historial" : "Ver historial"}
          </button>

          {isHistoryOpen ? (
            <div className="mt-3 grid gap-3">
              {evidenceHistory.map((evidence) => {
                const meta = EVIDENCE_META[evidence.evidenceType];

                return (
                  <div key={evidence.evidenceType} className="flex items-center gap-3 rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt p-3">
                    <EvidenceThumbnail evidence={evidence} compact />
                    <div className="min-w-0">
                      <p className="intra-body-strong text-intra-blue">{meta.title}</p>
                      <p className="mt-0.5 line-clamp-1 intra-caption text-intra-text-muted">
                        {formatEvidenceDate(evidence.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
