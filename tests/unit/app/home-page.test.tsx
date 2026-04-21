import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("shows the public CTA links", () => {
    render(<HomePage />);

    expect(
      screen.getByText(/conecta con viajeros y envía tus paquetes/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Iniciar sesión" })
    ).toHaveAttribute("href", "/login");

    expect(screen.getByRole("link", { name: "Registrarse" })).toHaveAttribute(
      "href",
      "/register"
    );
  });
});
