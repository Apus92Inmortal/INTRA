import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("shows the exact Atlas landing as the public home", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        name: /envía documentos y paquetes entre ciudades, hoy mismo/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Iniciar sesión" })
    ).toHaveAttribute("href", "https://intra-chi.vercel.app/login");

    expect(
      screen.getByRole("link", { name: "Registrarse gratis" })
    ).toHaveAttribute("href", "https://intra-chi.vercel.app/register");

    expect(
      screen.getAllByRole("link", { name: "Publicar envío" })[0]
    ).toHaveAttribute("href", "https://intra-chi.vercel.app/shipments/new");
  });
});
