"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Star } from "lucide-react";
import { createReviewAction } from "./actions";

type Props = {
  matchId: string;
  existingRating?: number | null;
  isExpired: boolean;
  otherUserName: string;
};

export default function ReviewComposer({
  matchId,
  existingRating = null,
  isExpired,
  otherUserName,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(existingRating ?? 0);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [sentRating, setSentRating] = useState(existingRating);
  const [error, setError] = useState<string | null>(null);

  const isSent = sentRating != null;
  const isDisabled = isPending || isSent || isExpired;
  const displayedRating = useMemo(
    () => hoveredRating ?? sentRating ?? rating,
    [hoveredRating, rating, sentRating]
  );

  function handleSubmit() {
    if (rating < 1 || isDisabled) return;

    setError(null);

    startTransition(async () => {
      const result = await createReviewAction(matchId, rating);

      if (!result.success) {
        setError(result.error || "No se pudo enviar la calificación");
        return;
      }

      setSentRating(rating);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-intra-border-strong bg-intra-card p-5 shadow-sm">
      <h2 className="intra-h3 text-intra-blue">
        {isSent ? "Tu calificación" : "Califica tu experiencia"}
      </h2>

      <p className="mt-3 intra-body text-intra-text-muted">
        Para {otherUserName}.
      </p>

      <div className="mt-5 grid grid-cols-5 gap-2" aria-label="Selector de calificación">
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          const isActive = value <= displayedRating;

          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                if (!isDisabled) setRating(value);
              }}
              onMouseEnter={() => {
                if (!isDisabled) setHoveredRating(value);
              }}
              onMouseLeave={() => setHoveredRating(null)}
              disabled={isDisabled}
              className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border px-2 py-2 intra-badge-text transition ${
                isActive
                  ? "border-intra-rating-star bg-intra-warning-soft text-intra-blue"
                  : "border-intra-border bg-intra-card text-intra-text-muted hover:border-intra-rating-star hover:bg-intra-warning-soft"
              } disabled:cursor-not-allowed disabled:opacity-80`}
              aria-label={`Calificar con ${value} estrella${value === 1 ? "" : "s"}`}
              aria-pressed={rating === value || sentRating === value}
            >
              <Star
                className={`h-6 w-6 ${isActive ? "fill-intra-rating-star text-intra-rating-star" : "text-intra-text-muted"}`}
                strokeWidth={1.9}
              />
              <span className="mt-1">{value}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 intra-body text-intra-text-muted">
        {isSent
          ? "Gracias por calificar."
          : "Las calificaciones ayudan a mejorar la comunidad."}
      </p>

      {isExpired && !isSent ? (
        <p className="mt-3 rounded-2xl border border-intra-border bg-intra-neutral-soft-alt px-4 py-3 intra-caption text-intra-text-muted">
          La ventana de calificación de 12 horas ya terminó.
        </p>
      ) : null}

      {isSent ? (
        <p className="mt-4 flex items-center gap-2 intra-body-strong text-intra-text-success">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
          Calificación enviada
        </p>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || rating < 1 || isExpired}
          className="intra-btn mt-4 min-h-11 w-full rounded-2xl bg-intra-success-bright px-5 py-2.5 text-intra-card transition hover:bg-intra-success-bright-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Enviando..." : "Enviar calificación"}
        </button>
      )}

      {error ? <p className="mt-3 intra-body text-intra-danger">{error}</p> : null}
    </section>
  );
}
