export type RatingSummary = {
  avgRating: number | null;
  totalReviews: number;
};

export const REVIEW_WINDOW_HOURS = 12;
export const REVIEW_REMINDER_HOURS = 6;

export type ReviewWindowState = {
  completedAt: Date | null;
  expiresAt: Date | null;
  reminderAt: Date | null;
  isExpired: boolean;
  isReminderDue: boolean;
};

type ReviewAggregateRow = {
  reviewed_user_id: string;
  rating: number | null;
};

function parseDate(value: string | Date | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toRoundedAverage(total: number, count: number) {
  return Math.round((total / count) * 10) / 10;
}

export function getReviewWindowState(
  completedAtValue: string | Date | null | undefined,
  nowValue: string | Date = new Date()
): ReviewWindowState {
  const completedAt = parseDate(completedAtValue);
  const now = parseDate(nowValue) ?? new Date();

  if (!completedAt) {
    return {
      completedAt: null,
      expiresAt: null,
      reminderAt: null,
      isExpired: false,
      isReminderDue: false,
    };
  }

  const expiresAt = new Date(completedAt.getTime() + REVIEW_WINDOW_HOURS * 60 * 60 * 1000);
  const reminderAt = new Date(completedAt.getTime() + REVIEW_REMINDER_HOURS * 60 * 60 * 1000);

  return {
    completedAt,
    expiresAt,
    reminderAt,
    isExpired: now.getTime() > expiresAt.getTime(),
    isReminderDue: now.getTime() >= reminderAt.getTime() && now.getTime() <= expiresAt.getTime(),
  };
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
