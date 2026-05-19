import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import PayoutAccountsManager from "@/app/app/wallet/payout/accounts/PayoutAccountsManager"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

vi.mock("@/app/app/wallet/actions", () => ({
  savePayoutAccountAction: vi.fn(),
  deletePayoutAccountAction: vi.fn(),
}))

describe("PayoutAccountsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the simplified empty state with the requested fields", () => {
    render(<PayoutAccountsManager accounts={[]} />)

    expect(
      screen.getByRole("heading", { name: "Métodos de retiro" })
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        "Agrega tu cuenta para recibir tus retiros cuando tengas saldo disponible."
      )
    ).toBeInTheDocument()

    expect(
      screen.getByRole("option", { name: "Selecciona una opción" })
    ).toBeInTheDocument()

    expect(screen.getByLabelText("Titular")).toBeInTheDocument()
    expect(screen.getByLabelText("Documento")).toBeInTheDocument()
    expect(
      screen.getByLabelText("Número de cuenta o celular")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Llave Bre-B")).toBeInTheDocument()

    expect(screen.queryByText(/^Banco$/i)).not.toBeInTheDocument()

    expect(
      screen.getByText("Usaremos esta información para enviarte tus retiros.")
    ).toBeInTheDocument()

    expect(screen.getByText("0 guardados")).toBeInTheDocument()
    expect(
      screen.getByText("Aún no tienes métodos guardados")
    ).toBeInTheDocument()
  })

  it("shows saved methods in the right column summary", () => {
    render(
      <PayoutAccountsManager
        accounts={[
          {
            id: "acc_1",
            account_holder_name: "Ana Pérez",
            document_number: "123456789",
            bank_name: "Nequi",
            account_type: "nequi",
            account_number: "3001234567",
            breb_key: null,
            is_default: true,
          },
        ]}
      />
    )

    expect(screen.getByText("1 guardado")).toBeInTheDocument()
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument()
    expect(screen.getByText("Principal")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Editar" })
    ).toBeInTheDocument()
  })
})
