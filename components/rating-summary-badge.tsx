import { formatRatingValue } from "@/lib/reviews";

type Props = {
  avgRating: number | null;
  totalReviews: number;
  className?: string;
};

export function RatingSummaryBadge({ avgRating, totalReviews, className = "" }: Props) {
  const formatted = formatRatingValue(avgRating);

  if (!formatted || totalReviews <= 0) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-intra-warning-soft-alt px-3 py-1 text-xs font-semibold text-intra-warning-text ${className}`.trim()}
    >
      <span aria-hidden="true">⭐</span>
      <span>
        {formatted}/{totalReviews}
      </span>
    </span>
  );
}
