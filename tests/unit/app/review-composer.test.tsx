import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReviewComposer from "@/app/app/matches/[id]/ReviewComposer";

const refresh = vi.fn();
const createReviewAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
  }),
}));

vi.mock("@/app/app/matches/[id]/actions", () => ({
  createReviewAction: (...args: unknown[]) => createReviewAction(...args),
}));

describe("ReviewComposer", () => {
  beforeEach(() => {
    refresh.mockClear();
    createReviewAction.mockReset();
  });

  it("keeps submit disabled until a rating is selected", async () => {
    const user = userEvent.setup();
    createReviewAction.mockResolvedValue({ success: true });

    render(
      <ReviewComposer
        matchId="match-1"
        isExpired={false}
        otherUserName="Persona INTRA"
      />
    );

    const submit = screen.getByRole("button", { name: "Enviar calificación" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Calificar con 4 estrellas" }));
    expect(submit).toBeEnabled();

    await user.click(submit);

    expect(createReviewAction).toHaveBeenCalledWith("match-1", 4);
    expect(await screen.findByText("Calificación enviada")).toBeVisible();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("renders sent state when the user already reviewed the match", () => {
    render(
      <ReviewComposer
        matchId="match-1"
        existingRating={5}
        isExpired={false}
        otherUserName="Persona INTRA"
      />
    );

    expect(screen.getByRole("heading", { name: "Tu calificación" })).toBeVisible();
    expect(screen.getByText("Calificación enviada")).toBeVisible();
    expect(screen.getByText("Gracias por calificar.")).toBeVisible();
    expect(screen.queryByText("Enviada")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar calificación" })).not.toBeInTheDocument();
  });

  it("disables submission when the review window expired", () => {
    render(
      <ReviewComposer
        matchId="match-1"
        isExpired
        otherUserName="Persona INTRA"
      />
    );

    expect(screen.getByText("La ventana de calificación de 12 horas ya terminó.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Enviar calificación" })).toBeDisabled();
  });
});
