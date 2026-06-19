import { describe, it, expect } from "vitest";
import { getNotificationHref } from "@/lib/notifications/navigation";

describe("getNotificationHref", () => {
  it("should return chat route for new_message with match_id", () => {
    const notification = {
      type: "new_message",
      related_match_id: "match-123",
    };
    expect(getNotificationHref(notification)).toBe("/app/matches/match-123/chat");
  });

  it("should return match route for match_requested with match_id", () => {
    const notification = {
      type: "match_requested",
      related_match_id: "match-456",
    };
    expect(getNotificationHref(notification)).toBe("/app/matches/match-456");
  });

  it("should return match route for shipment_alert with match_id", () => {
    const notification = {
      type: "shipment_alert",
      related_match_id: "match-alert-1",
    };
    expect(getNotificationHref(notification)).toBe("/app/matches/match-alert-1");
  });

  it("should return match route for admin_case_update with match_id", () => {
    const notification = {
      type: "admin_case_update",
      related_match_id: "match-admin-1",
    };
    expect(getNotificationHref(notification)).toBe("/app/matches/match-admin-1");
  });

  it("should return wallet route for payment_confirmed", () => {
    const notification = {
      type: "payment_confirmed",
      related_match_id: null,
    };
    expect(getNotificationHref(notification)).toBe("/app/wallet");
  });

  it("should return profile route for verification_approved", () => {
    const notification = {
      type: "verification_approved",
      related_match_id: null,
    };
    expect(getNotificationHref(notification)).toBe("/app/profile");
  });

  it("should return null for unknown type", () => {
    const notification = {
      type: "unknown_event",
      related_match_id: "match-789",
    };
    expect(getNotificationHref(notification)).toBeNull();
  });

  it("should return null if type requires match_id but it is missing", () => {
    const notification = {
      type: "new_message",
      related_match_id: null,
    };
    expect(getNotificationHref(notification)).toBeNull();
  });
  
  it("should return wallet route for payout_paid", () => {
    const notification = {
      type: "payout_paid",
      related_match_id: null,
    };
    expect(getNotificationHref(notification)).toBe("/app/wallet");
  });
});
