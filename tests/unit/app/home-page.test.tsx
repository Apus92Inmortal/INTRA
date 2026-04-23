import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("shows the migrated Atlas-style CTA links", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /envía documentos y paquetes entre ciudades, hoy mismo/i,
      })
    ).toBeInTheDocument();

    expect(
      screen
        .getAllByRole("link", { name: "Iniciar sesión" })
        .some((link) => link.getAttribute("href") === "/login")
    ).toBe(true);

    expect(
      screen
        .getAllByRole("link", { name: "Registrarse gratis" })
        .some((link) => link.getAttribute("href") === "/register")
    ).toBe(true);

    expect(
      screen
        .getAllByRole("link", { name: "Publicar envío" })
        .some((link) => link.getAttribute("href") === "/app/shipments/new")
    ).toBe(true);
  });
});
