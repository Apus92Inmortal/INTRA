import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("shows the exact Atlas landing as the public home", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        name: /envía paquetes entre ciudades aprovechando viajeros que ya van en camino/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Iniciar sesión" })
    ).toHaveAttribute("href", "/login");

    expect(
      screen.getByRole("link", { name: "Registrarse" })
    ).toHaveAttribute("href", "/register");

    expect(
      screen.getAllByRole("link", { name: "Publicar envío" })[0]
    ).toHaveAttribute("href", "/register?next=/app/shipments/new");

    expect(
      screen.getAllByRole("link", { name: "Publicar viaje" })[0]
    ).toHaveAttribute("href", "/register?next=/app/trips/new");

    expect(
      screen.getByRole("link", { name: "Términos y condiciones" })
    ).toHaveAttribute("href", "/legal/terms-conditions");

    expect(
      screen.getByRole("link", { name: "Política de privacidad" })
    ).toHaveAttribute("href", "/legal/privacy-policy");

    expect(
      screen.queryByRole("link", { name: "Contáctanos" })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "INTRA" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Instagram" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "TikTok" })).not.toBeInTheDocument();
    expect(screen.getByText("Contacto")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "soporte@intra.com.co" })
    ).toHaveAttribute("href", "mailto:soporte@intra.com.co");
    expect(screen.getByText("+57 301 231 9742")).toBeInTheDocument();
  });
});
