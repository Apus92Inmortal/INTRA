"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { KebabMenu } from "@/components/kebab-menu";

type ActionResult = Promise<{ success: boolean; error?: string }>;

type CancelMatchDialogProps = {
  matchId: string;
  status: "pending" | "accepted";
  onCancel: (matchId: string) => ActionResult;
};

const copyByStatus = {
  pending: {
    title: "¿Cancelar esta solicitud?",
    description: "La solicitud quedará cerrada y la otra parte verá el acuerdo como cancelado.",
  },
  accepted: {
    title: "Vas a cancelar este acuerdo.",
    description: "El dinero retenido se devolverá al wallet del cliente. ¿Confirmas?",
  },
} as const;

export default function CancelMatchDialog({
  matchId,
  status,
  onCancel,
}: CancelMatchDialogProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const copy = copyByStatus[status];

  function handleCancel() {
    setError(null);

    startTransition(async () => {
      const result = await onCancel(matchId);

      if (!result.success) {
        setError(result.error || "No se pudo cancelar el acuerdo.");
        return;
      }

      setFeedback("Acuerdo cancelado.");
      setIsDialogOpen(false);
      router.push("/app/matches");
      router.refresh();
    });
  }

  return (
    <>
      <KebabMenu
        label="Abrir acciones del acuerdo"
        items={[
          {
            label: "Cancelar acuerdo",
            tone: "danger",
            onSelect: () => {
              setError(null);
              setIsDialogOpen(true);
            },
          },
        ]}
      />

      {feedback ? (
        <p
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-intra-success-border bg-intra-success-soft px-4 py-3 text-[14px] font-semibold leading-5 text-intra-text-success shadow-[0_16px_40px_rgba(11,44,74,0.16)]"
        >
          {feedback}
        </p>
      ) : null}

      {isDialogOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-40 flex items-center justify-center bg-intra-blue/45 px-4 py-6"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-match-title"
            className="w-full max-w-md rounded-[24px] border border-intra-danger-border bg-intra-card p-5 shadow-[0_24px_70px_rgba(11,44,74,0.22)] sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-intra-danger-soft text-intra-danger">
                <AlertTriangle className="intra-icon-body" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 id="cancel-match-title" className="intra-h3">
                  {copy.title}
                </h2>
                <p className="mt-2 intra-body text-intra-text-muted">
                  {copy.description}
                </p>
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-2xl border border-intra-danger-border bg-intra-danger-soft px-4 py-3 text-[14px] font-medium leading-5 text-intra-danger">
                {error}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  setIsDialogOpen(false);
                }}
                className="intra-btn min-h-10 rounded-2xl border border-intra-border-strong bg-intra-card px-4 py-2 text-intra-blue hover:bg-intra-bg-app disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleCancel}
                className="intra-btn min-h-10 rounded-2xl border border-intra-danger-border bg-intra-danger-soft px-4 py-2 text-intra-danger hover:bg-intra-danger-soft disabled:opacity-50"
              >
                {isPending ? "Cancelando..." : "Sí, cancelar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
