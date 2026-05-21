import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CancelMatchDialog from "@/app/app/matches/[id]/CancelMatchDialog";

const push = vi.fn();
const refresh = vi.fn();
const cancelAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}));

describe("CancelMatchDialog", () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
    cancelAction.mockReset();
  });

  it("renders the pending copy without refund language", async () => {
    const user = userEvent.setup();
    cancelAction.mockResolvedValue({ success: true });

    render(
      <CancelMatchDialog
        matchId="match-1"
        status="pending"
        onCancel={cancelAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "Abrir acciones del acuerdo" }));
    await user.click(screen.getByRole("menuitem", { name: "Cancelar acuerdo" }));

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByText("¿Cancelar esta solicitud?")).toBeVisible();
    expect(screen.queryByText(/dinero retenido/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancels accepted matches with refund copy and redirects to matches", async () => {
    const user = userEvent.setup();
    cancelAction.mockResolvedValue({ success: true });

    render(
      <CancelMatchDialog
        matchId="match-1"
        status="accepted"
        onCancel={cancelAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "Abrir acciones del acuerdo" }));
    await user.click(screen.getByRole("menuitem", { name: "Cancelar acuerdo" }));

    expect(screen.getByText("Vas a cancelar este acuerdo.")).toBeVisible();
    expect(screen.getByText("El dinero retenido se devolverá al wallet del cliente. ¿Confirmas?")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Sí, cancelar" }));

    await waitFor(() => {
      expect(cancelAction).toHaveBeenCalledWith("match-1");
      expect(push).toHaveBeenCalledWith("/app/matches");
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the modal open when cancellation fails", async () => {
    const user = userEvent.setup();
    cancelAction.mockResolvedValue({ success: false, error: "No autorizado" });

    render(
      <CancelMatchDialog
        matchId="match-1"
        status="accepted"
        onCancel={cancelAction}
      />
    );

    await user.click(screen.getByRole("button", { name: "Abrir acciones del acuerdo" }));
    await user.click(screen.getByRole("menuitem", { name: "Cancelar acuerdo" }));
    await user.click(screen.getByRole("button", { name: "Sí, cancelar" }));

    expect(await screen.findByText("No autorizado")).toBeVisible();
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(push).not.toHaveBeenCalled();
  });
});
