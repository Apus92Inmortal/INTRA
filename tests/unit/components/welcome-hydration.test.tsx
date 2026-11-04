import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WelcomeModal from "@/components/WelcomeModal";

const { save, update, from, push } = vi.hoisted(() => ({
  save: vi.fn(), update: vi.fn(), from: vi.fn(), push: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }));

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  save.mockResolvedValue({ error: null });
  update.mockReturnValue({ eq: save });
  from.mockReturnValue({ update });
});

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Welcome first-load hydration", () => {
  it.each([true, false])("hydrates initialOpen=%s without replacing server HTML", async (initialOpen) => {
    const tree = <><WelcomeModal userId="synthetic-user" initialOpen={initialOpen} /><main><h1>Hola</h1><button>Fuera</button></main></>;
    let html: string;
    // The server has no document; hydration runs with the real DOM available.
    vi.stubGlobal("document", undefined);
    try { html = renderToString(tree); } finally { vi.unstubAllGlobals(); }
    container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const heading = container.querySelector("h1");
    const recoverableError = vi.fn();
    await act(async () => { root = hydrateRoot(container!, tree, { onRecoverableError: recoverableError }); });
    expect(recoverableError).not.toHaveBeenCalled();
    expect(container.querySelector("h1")).toBe(heading);
    expect(save).not.toHaveBeenCalled();
    if (initialOpen) {
      expect(screen.getByRole("dialog", { name: "Bienvenido a INTRA" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Completar perfil" })).toHaveFocus();
      expect(document.body.style.overflow).toBe("hidden");
      const user = userEvent.setup();
      await user.tab({ shift: true });
      expect(screen.getByRole("button", { name: "Ahora no" })).toHaveFocus();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe("");
    } else {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe("");
    }
  });

  it.each(["Ahora no", "Completar perfil"])("%s persists dismissal for this user", async (action) => {
    render(<WelcomeModal userId="synthetic-user" initialOpen />);
    await userEvent.setup().click(screen.getByRole("button", { name: action }));
    expect(from).toHaveBeenCalledWith("profiles");
    expect(update).toHaveBeenCalledWith({ show_welcome_modal: false });
    expect(save).toHaveBeenCalledWith("id", "synthetic-user");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    if (action === "Completar perfil") expect(push).toHaveBeenCalledWith("/app/profile");
    else expect(push).not.toHaveBeenCalled();
  });

  it.each(["Ahora no", "Completar perfil"])("%s keeps welcome open if saving fails", async (action) => {
    save.mockResolvedValue({ error: { message: "synthetic failure" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<WelcomeModal userId="synthetic-user" initialOpen />);
    await userEvent.setup().click(screen.getByRole("button", { name: action }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: action })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });
});
