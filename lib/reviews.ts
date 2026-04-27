export type RatingSummary = {
  avgRating: number | null;
  totalReviews: number;
};

type ReviewAggregateRow = {
  reviewed_user_id: string;
  rating: number | null;
};

function toRoundedAverage(total: number, count: number) {
  return Math.round((total / count) * 10) / 10;
}

export function formatRatingValue(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  return value.toFixed(1);
}

export function buildRatingSummaryMap(
  rows: ReviewAggregateRow[],
  userIds: string[]
): Record<string, RatingSummary> {
  const summaryMap: Record<string, RatingSummary> = {};
  const accumulator = new Map<string, { total: number; count: number }>();

  for (const userId of userIds) {
    summaryMap[userId] = {
      avgRating: null,
      totalReviews: 0,
    };
  }

  for (const row of rows) {
    if (!row.reviewed_user_id || row.rating == null) continue;

    const current = accumulator.get(row.reviewed_user_id) ?? { total: 0, count: 0 };
    accumulator.set(row.reviewed_user_id, {
      total: current.total + row.rating,
      count: current.count + 1,
    });
  }

  for (const [userId, value] of accumulator.entries()) {
    summaryMap[userId] = {
      avgRating: value.count > 0 ? toRoundedAverage(value.total, value.count) : null,
      totalReviews: value.count,
    };
  }

  return summaryMap;
}

type ReviewsSupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => {
      in: (
        column: string,
        values: string[]
      ) => PromiseLike<{
        data: ReviewAggregateRow[] | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export async function fetchRatingSummaryMap(
  supabase: ReviewsSupabaseLike,
  userIds: Array<string | null | undefined>
) {
  const normalizedIds = Array.from(
    new Set(userIds.filter((value): value is string => Boolean(value)))
  );

  if (normalizedIds.length === 0) {
    return {} as Record<string, RatingSummary>;
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("reviewed_user_id, rating")
    .in("reviewed_user_id", normalizedIds);

  if (error) {
    console.error("Error loading rating summaries:", error.message);
    return buildRatingSummaryMap([], normalizedIds);
  }

  return buildRatingSummaryMap((data ?? []) as ReviewAggregateRow[], normalizedIds);
}
