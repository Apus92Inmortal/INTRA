import type { ReactNode } from "react";
import { Camera, ImageIcon, PackageCheck, Truck } from "lucide-react";
import EvidenceUploader from "./EvidenceUploader";

export type ShipmentEvidenceType =
  | "customer_initial_photo"
  | "pickup_photo"
  | "delivery_photo";

export type ShipmentEvidenceViewItem = {
  id: string;
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
  deliveryEvidence: ShipmentEvidenceViewItem | null;
  canUploadPickup: boolean;
  canUploadDelivery: boolean;
};

type EvidenceBlockProps = {
  title: string;
  description: string;
  evidence: ShipmentEvidenceViewItem | null;
  icon: ReactNode;
  emptyText: string;
  uploader?: ReactNode;
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

function EvidenceBlock({
  title,
  description,
  evidence,
  icon,
  emptyText,
  uploader,
}: EvidenceBlockProps) {
  return (
    <section className="rounded-2xl border border-intra-border bg-intra-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-intra-info-soft text-intra-info">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-intra-blue">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-intra-text-muted">{description}</p>
        </div>
      </div>

      {evidence ? (
        <div className="mt-4 flex gap-3 rounded-2xl border border-intra-border-soft bg-intra-neutral-soft-alt p-3">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-intra-border bg-intra-card">
            {evidence.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={evidence.signedUrl}
                alt={`Evidencia ${title.toLowerCase()}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageIcon className="h-6 w-6 text-intra-text-muted" strokeWidth={1.8} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-intra-blue">
              {evidence.signedUrl ? "Evidencia disponible" : "Imagen no disponible"}
            </p>
            <p className="mt-1 text-xs leading-5 text-intra-text-muted">
              Subida por {evidence.uploadedByName} · {formatEvidenceDate(evidence.createdAt)}
            </p>
            {evidence.note ? (
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-intra-blue">
                {evidence.note}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-intra-border bg-intra-neutral-soft-alt px-4 py-3">
          <p className="text-xs leading-5 text-intra-text-muted">{emptyText}</p>
        </div>
      )}

      {!evidence && uploader ? <div className="mt-4">{uploader}</div> : null}
    </section>
  );
}

export default function ShipmentEvidencePanel({
  shipmentId,
  matchId,
  travelerId,
  initialEvidence,
  pickupEvidence,
  deliveryEvidence,
  canUploadPickup,
  canUploadDelivery,
}: ShipmentEvidencePanelProps) {
  return (
    <section className="rounded-2xl border border-intra-border-strong bg-[linear-gradient(180deg,var(--intra-card)_0%,var(--intra-neutral-soft-alt)_100%)] p-5 shadow-sm">
      <div>
        <h2 className="intra-h3">Evidencias del envío</h2>
        <p className="mt-1 text-xs leading-5 text-intra-text-muted">
          Fotos de soporte para comparar el estado del paquete. No confirman entrega ni liberan pagos automáticamente.
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        <EvidenceBlock
          title="Foto inicial"
          description="Referencia subida por el cliente antes del pago."
          evidence={initialEvidence}
          icon={<Camera className="h-5 w-5" strokeWidth={2} />}
          emptyText="Aún no hay foto inicial disponible para este envío."
        />

        <EvidenceBlock
          title="Recogida"
          description="Soporte visual del estado recibido por el viajero."
          evidence={pickupEvidence}
          icon={<PackageCheck className="h-5 w-5" strokeWidth={2} />}
          emptyText="Aún no hay evidencia de recogida."
          uploader={
            canUploadPickup ? (
              <EvidenceUploader
                shipmentId={shipmentId}
                matchId={matchId}
                expectedUploaderId={travelerId}
                evidenceType="pickup_photo"
                title="Subir evidencia de recogida"
                description="Sube una foto clara del paquete recibido. Esta evidencia no libera pagos."
                submitLabel="Guardar recogida"
              />
            ) : null
          }
        />

        <EvidenceBlock
          title="Entrega"
          description="Soporte visual previo o cercano al reporte de entrega."
          evidence={deliveryEvidence}
          icon={<Truck className="h-5 w-5" strokeWidth={2} />}
          emptyText="Aún no hay evidencia de entrega."
          uploader={
            canUploadDelivery ? (
              <EvidenceUploader
                shipmentId={shipmentId}
                matchId={matchId}
                expectedUploaderId={travelerId}
                evidenceType="delivery_photo"
                title="Subir evidencia de entrega"
                description="Sube una foto de soporte de la entrega. No reemplaza la confirmación del cliente."
                submitLabel="Guardar entrega"
              />
            ) : null
          }
        />
      </div>
    </section>
  );
}
