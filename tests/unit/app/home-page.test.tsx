import { render, screen } from "@testing-library/react"
import HomePage from "@/app/page"

describe("HomePage", () => {
  it("renders the replicated marketing landing", () => {
    render(<HomePage />)

    expect(
      screen.getByRole("heading", {
        name: /envía documentos y paquetes entre ciudades, hoy mismo/i,
      })
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        /conectamos personas que necesitan enviar algo con viajeros que ya van a volar/i
      )
    ).toBeInTheDocument()

    expect(screen.getAllByRole("link", { name: "Inicio" })[0]).toHaveAttribute(
      "href",
      "/"
    )

    expect(screen.getAllByRole("link", { name: "Cómo funciona" })[0]).toHaveAttribute(
      "href",
      "/como-funciona"
    )

    expect(screen.getByText("Publica tu envío")).toBeInTheDocument()
    expect(screen.getByText("Rápido y sencillo")).toBeInTheDocument()
  })
})
