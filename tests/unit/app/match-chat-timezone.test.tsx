import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MatchChatClient from "@/app/app/matches/[id]/chat/MatchChatClient";

// SSR never subscribes or reads data; only the external client boundary is stubbed.
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const cases = [
  ["2026-11-04T17:21:00Z", "12:21 p. m."],
  ["2026-11-05T04:59:00Z", "11:59 p. m."],
  ["2026-11-05T05:00:00Z", "12:00 a. m."],
  ["2026-11-05T16:59:00Z", "11:59 a. m."],
  ["2026-11-05T17:00:00Z", "12:00 p. m."],
  ["2026-11-04T12:21:00-05:00", "12:21 p. m."],
] as const;

describe("Chat timestamps use Colombian time, not the host timezone", () => {
  it.each(["owner", "traveler"] as const)("renders sent and received timestamps for %s", (viewerRole) => {
    const html = renderToString(<MatchChatClient
      matchId="synthetic-match" currentUserId="me" otherUserId="other"
      currentUserName="QA" otherUserName="Otra cuenta"
      otherUserAvgRating={null} otherUserTotalReviews={0}
      shipmentTrackingCode={null} shipmentRouteLabel="Bogotá → Medellín"
      shipmentDescription={null} viewerRole={viewerRole}
      lastReadByOwner={null} lastReadByTraveler={null}
      initialMessages={cases.map(([created_at], index) => ({
        id: String(index), match_id: "synthetic-match",
        sender_id: index % 2 ? "me" : "other", message: `Mensaje ${index}`, created_at,
      }))}
    />);
    for (const [, expected] of cases) expect(html).toContain(`<span>${expected}</span>`);
  });
});
