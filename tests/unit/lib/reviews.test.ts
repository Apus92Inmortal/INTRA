import {
  REVIEW_REMINDER_HOURS,
  REVIEW_WINDOW_HOURS,
  buildRatingSummaryMap,
  formatRatingValue,
  getReviewWindowState,
} from "@/lib/reviews";

describe("lib/reviews", () => {
  it("builds rating summaries per user", () => {
    const summary = buildRatingSummaryMap(
      [
        { reviewed_user_id: "user-1", rating: 5 },
        { reviewed_user_id: "user-1", rating: 4 },
        { reviewed_user_id: "user-2", rating: 3 },
      ],
      ["user-1", "user-2", "user-3"]
    );

    expect(summary["user-1"]).toEqual({ avgRating: 4.5, totalReviews: 2 });
    expect(summary["user-2"]).toEqual({ avgRating: 3, totalReviews: 1 });
    expect(summary["user-3"]).toEqual({ avgRating: null, totalReviews: 0 });
  });

  it("formats average rating with one decimal", () => {
    expect(formatRatingValue(4)).toBe("4.0");
    expect(formatRatingValue(4.75)).toBe("4.8");
    expect(formatRatingValue(null)).toBeNull();
  });

  it("calculates the review window and reminder threshold", () => {
    const completedAt = "2026-05-20T00:00:00.000Z";

    const beforeReminder = getReviewWindowState(completedAt, "2026-05-20T05:59:00.000Z");
    expect(beforeReminder.isExpired).toBe(false);
    expect(beforeReminder.isReminderDue).toBe(false);

    const afterReminder = getReviewWindowState(
      completedAt,
      `2026-05-20T${String(REVIEW_REMINDER_HOURS).padStart(2, "0")}:01:00.000Z`
    );
    expect(afterReminder.isExpired).toBe(false);
    expect(afterReminder.isReminderDue).toBe(true);

    const afterWindow = getReviewWindowState(
      completedAt,
      `2026-05-20T${String(REVIEW_WINDOW_HOURS + 1).padStart(2, "0")}:00:00.000Z`
    );
    expect(afterWindow.isExpired).toBe(true);
    expect(afterWindow.isReminderDue).toBe(false);
  });
});
