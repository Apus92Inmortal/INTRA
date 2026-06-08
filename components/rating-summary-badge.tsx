import { formatRatingValue } from "@/lib/reviews";
import { Star } from "lucide-react";

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
      className={`intra-badge intra-badge-warning w-fit ${className}`.trim()}
    >
      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
      <span>{formatted}</span>
    </span>
  );
}
