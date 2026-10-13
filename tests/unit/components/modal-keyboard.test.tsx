import { StrictMode, useState } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntraBottomSheet, IntraConfirmDialog, IntraDrawer, IntraModal } from "@/components/ui/intra-foundation";
import { LegalDocumentModal } from "@/components/legal-document-modal";
import { EvidenceImagePreview } from "@/components/evidence-image-preview";
import WelcomeModal from "@/components/WelcomeModal";
import EvidenceUploader from "@/app/app/matches/[id]/EvidenceUploader";
import SuspiciousReportForm from "@/app/app/matches/[id]/SuspiciousReportForm";
import { TERMS_CONDITIONS_DOCUMENT } from "@/lib/legal/documents";

const { updateWelcome } = vi.hoisted(() => ({ updateWelcome: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: () => ({ update: () => ({ eq: updateWelcome }) }) }),
}));
vi.mock("@/app/app/matches/[id]/actions", () => ({ notifyAdminSuspiciousReportAction: vi.fn() }));

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Abrir ventana</button>
    <button>Fuera</button>
    <IntraModal open={open} title="Ventana" onClose={() => setOpen(false)}>
      <button disabled>Deshabilitado</button>
      <button hidden>Oculto</button>
      <button>Último</button>
    </IntraModal>
  </>;
}

describe("Modal keyboard interaction", () => {
  beforeEach(() => { updateWelcome.mockReset(); });

  it("traps Tab and Shift+Tab, blocks focus outside and restores the opener in StrictMode", async () => {
    const user = userEvent.setup();
    render(<StrictMode><ModalHarness /></StrictMode>);
    const opener = screen.getByRole("button", { name: "Abrir ventana" });
    await user.click(opener);
    const close = screen.getByRole("button", { name: "Cerrar" });
    const last = screen.getByRole("button", { name: "Último" });
    expect(close).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    screen.getByRole("button", { name: "Fuera" }).focus();
    expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("focuses Cancelar first and keeps a loading confirmation open even with a close icon", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const view = render(<IntraConfirmDialog open title="Eliminar" description="Irreversible" confirmLabel="Eliminar" showCloseButton onCancel={onCancel} onConfirm={onConfirm} />);
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    view.rerender(<IntraConfirmDialog open title="Eliminar" description="Irreversible" confirmLabel="Eliminar" showCloseButton isLoading onCancel={onCancel} onConfirm={onConfirm} />);
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await user.tab();
    expect(screen.getByRole("dialog")).toHaveFocus();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("dismisses only the nested dialog with Escape and returns focus through each opener", async () => {
    function NestedDialogs() {
      const [outer, setOuter] = useState(false);
      const [inner, setInner] = useState(false);
      return <>
        <button onClick={() => setOuter(true)}>Abrir principal</button>
        <IntraModal open={outer} title="Principal" onClose={() => setOuter(false)}>
          <button onClick={() => setInner(true)}>Abrir detalle</button>
          <IntraModal open={inner} title="Detalle" onClose={() => setInner(false)}><button>Detalle acción</button></IntraModal>
        </IntraModal>
      </>;
    }
    const user = userEvent.setup();
    render(<NestedDialogs />);
    const opener = screen.getByRole("button", { name: "Abrir principal" });
    await user.click(opener);
    const innerOpener = screen.getByRole("button", { name: "Abrir detalle" });
    await user.click(innerOpener);
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Principal" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Detalle" })).not.toBeInTheDocument();
    expect(innerOpener).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps keyboard focus on the panel when no control is available and consumes Escape", () => {
    const outerEscape = vi.fn();
    document.addEventListener("keydown", outerEscape);
    try {
      render(<IntraModal open title="Procesando"><p>Espera</p></IntraModal>);
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveFocus();
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(dialog).toHaveFocus();
      expect(outerEscape).toHaveBeenCalledTimes(1); // Tab only; Escape cannot reach an outer listener.
    } finally {
      document.removeEventListener("keydown", outerEscape);
    }
  });

  it.each([IntraDrawer, IntraBottomSheet])("supports keyboard cycling and dismissal in drawers and bottom sheets", async (Overlay) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Overlay open title="Panel" onClose={onClose}><button>Último</button></Overlay>);
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Último" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("opens long legal content at its title in a body portal and permits Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<LegalDocumentModal documentKey="terms-conditions" documents={{ "terms-conditions": TERMS_CONDITIONS_DOCUMENT }} titleId="legal-title" onClose={onClose} onAcceptAndContinue={vi.fn()} />);
    const title = screen.getByRole("heading", { name: "Términos y Condiciones", level: 2 });
    const dialog = screen.getByRole("dialog");
    expect(title).toHaveFocus();
    expect(container).not.toContainElement(dialog);
    expect(dialog).not.toHaveAttribute("aria-describedby");
    await user.tab();
    expect(screen.getByRole("button", { name: "Cerrar ventana legal" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("returns from evidence image preview to its thumbnail without background focus", async () => {
    const user = userEvent.setup();
    const { container } = render(<EvidenceImagePreview src="/synthetic-test.jpg" alt="Foto inicial"><span>Miniatura</span></EvidenceImagePreview>);
    const opener = screen.getByRole("button", { name: "Abrir Foto inicial" });
    await user.click(opener);
    expect(container).not.toContainElement(screen.getByRole("dialog"));
    expect(screen.getByRole("button", { name: "Cerrar imagen" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Cerrar imagen" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(opener).toHaveFocus();
  });

  it("uses the existing Welcome dismissal on Escape once and blocks repeat dismissal while saving", async () => {
    let finish!: (result: { error: null }) => void;
    updateWelcome.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    render(<WelcomeModal userId="synthetic-user" initialOpen />);
    expect(screen.getByRole("dialog", { name: "Bienvenido a INTRA" })).toBeInTheDocument();
    await user.keyboard("{Escape}{Escape}");
    expect(updateWelcome).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await act(async () => { finish({ error: null }); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens evidence uploads in a body portal and returns to their trigger with Escape", async () => {
    const user = userEvent.setup();
    const { container } = render(<EvidenceUploader shipmentId="shipment" matchId="match" expectedUploaderId="traveler" evidenceType="pickup_photo" title="Evidencia recogida" description="Foto de soporte" triggerLabel="Añadir foto" submitLabel="Guardar" completeAction={vi.fn()} />);
    const opener = screen.getByRole("button", { name: "Añadir foto" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Evidencia recogida" });
    expect(container).not.toContainElement(dialog);
    expect(within(dialog).getByRole("button", { name: "Cerrar" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(opener).toHaveFocus();
  });

  it("keeps the report controls inside the dialog's tab cycle", async () => {
    const user = userEvent.setup();
    render(<SuspiciousReportForm shipmentId="shipment" matchId="match" reporterName="Prueba" recipientUserId="customer" />);
    const opener = screen.getByRole("button", { name: "Reportar Novedad" });
    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Reportar Novedad" });
    const close = within(dialog).getByRole("button", { name: "Cerrar" });
    await user.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: /Enviar/ })).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(opener).toHaveFocus();
  });
});
