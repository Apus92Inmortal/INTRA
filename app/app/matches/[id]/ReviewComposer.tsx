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
  expiresAtLabel?: string | null;
};

export default function ReviewComposer({
  matchId,
  existingRating = null,
  isExpired,
  otherUserName,
  expiresAtLabel = null,
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
    <section className="rounded-[24px] border border-[#e4e7ec] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[18px] font-bold leading-6 text-[#0B2C4A]">
          Califica tu experiencia
        </h2>
        {isSent ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EFFBF4] px-3 py-1 text-[12px] font-semibold leading-[18px] text-[#1e8c4e]">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
            Enviada
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-[14px] font-normal leading-[22px] text-[#667085]">
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
              className={`flex min-h-[60px] flex-col items-center justify-center rounded-2xl border px-2 py-2 text-[12px] font-semibold leading-[18px] transition ${
                isActive
                  ? "border-[#fbbf24] bg-[#FFF7ED] text-[#0B2C4A]"
                  : "border-[#e4e7ec] bg-white text-[#667085] hover:border-[#fbbf24] hover:bg-[#FFF7ED]"
              } disabled:cursor-not-allowed disabled:opacity-80`}
              aria-label={`Calificar con ${value} estrella${value === 1 ? "" : "s"}`}
              aria-pressed={rating === value || sentRating === value}
            >
              <Star
                className={`h-6 w-6 ${isActive ? "fill-[#fbbf24] text-[#fbbf24]" : "text-[#98A2B3]"}`}
                strokeWidth={1.9}
              />
              <span className="mt-1">{value}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[14px] font-normal leading-[22px] text-[#667085]">
        Las calificaciones ayudan a mejorar la comunidad.
      </p>

      {isExpired && !isSent ? (
        <p className="mt-3 rounded-2xl border border-[#e4e7ec] bg-[#f5f8fb] px-4 py-3 text-[12px] font-normal leading-[18px] text-[#667085]">
          La ventana de calificación de 12 horas ya terminó.
        </p>
      ) : null}

      {isSent ? (
        <p className="mt-4 flex items-center gap-2 text-[14px] font-bold leading-5 text-[#1e8c4e]">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
          Calificación enviada
        </p>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || rating < 1 || isExpired}
          className="mt-4 min-h-11 w-full rounded-2xl bg-[#2ECC71] px-5 py-2.5 text-[14px] font-bold leading-5 text-white transition hover:bg-[#27ae60] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Enviando..." : "Enviar calificación"}
        </button>
      )}

      {!isExpired && !isSent && expiresAtLabel ? (
        <p className="mt-3 text-[12px] font-normal leading-[18px] text-[#667085]">
          Disponible hasta {expiresAtLabel}.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-[14px] leading-[22px] text-intra-danger">{error}</p> : null}
    </section>
  );
}
