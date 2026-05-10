"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReviewAction } from "./actions";

type Props = {
  matchId: string;
  otherUserName: string;
};

export default function ReviewComposer({ matchId, otherUserName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const displayedRating = useMemo(
    () => hoveredRating ?? rating,
    [hoveredRating, rating]
  );

  function handleSubmit() {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await createReviewAction(matchId, rating, comment);

      if (!result.success) {
        setError(result.error || "No se pudo enviar la review");
        return;
      }

      setSuccess("Gracias. Tu review ya quedó publicada.");
      setComment("");
      setRating(0);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-intra-blue/10 bg-intra-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-intra-blue">
            ¿Cómo fue tu experiencia con {otherUserName}?
          </h2>
          <p className="mt-1 text-sm text-intra-text-muted">
            Tu calificación ayuda a generar confianza dentro de INTRA.
          </p>
        </div>

        <span className="inline-flex w-fit rounded-full bg-intra-neutral-pill px-3 py-1 text-xs font-semibold text-intra-blue">
          Review pendiente
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          const isActive = value <= displayedRating;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoveredRating(value)}
              onMouseLeave={() => setHoveredRating(null)}
              className={`min-h-11 min-w-11 rounded-2xl border px-3 py-2 text-2xl transition ${
                isActive
                  ? "border-intra-warning-border bg-intra-warning-soft text-intra-warning"
                  : "border-intra-border bg-intra-card text-intra-text-muted/50 hover:border-intra-warning-border hover:text-intra-warning"
              }`}
              aria-label={`Calificar con ${value} estrella${value === 1 ? "" : "s"}`}
            >
              ★
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-intra-text-muted" htmlFor="review-comment">
          Comentario (opcional)
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(event) => {
            if (event.target.value.length <= 300) {
              setComment(event.target.value);
            }
          }}
          rows={4}
          placeholder="Cuéntale a la comunidad cómo fue la experiencia."
          className="mt-2 w-full rounded-2xl border border-intra-border bg-intra-card px-4 py-3 text-sm text-intra-blue outline-none transition placeholder:text-intra-text-muted/70 focus:border-intra-blue focus:ring-2 focus:ring-intra-blue/10"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-intra-text-muted/70">Máximo 300 caracteres.</p>
          <p className="text-xs font-medium text-intra-text-muted">{comment.length}/300</p>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-intra-danger">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-intra-text-success">{success}</p> : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || rating < 1}
        className="intra-btn intra-btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isPending ? "Enviando..." : "Enviar review"}
      </button>
    </section>
  );
}
