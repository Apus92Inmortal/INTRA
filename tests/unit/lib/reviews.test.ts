import { buildRatingSummaryMap, formatRatingValue } from "@/lib/reviews";

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
});
