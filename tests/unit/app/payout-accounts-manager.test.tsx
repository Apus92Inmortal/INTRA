import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import PayoutAccountsManager from "@/app/app/wallet/payout/accounts/PayoutAccountsManager"
import { deletePayoutAccountAction } from "@/app/app/wallet/actions"

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

  it("renders the simplified empty state with the requested fields", async () => {
    const user = userEvent.setup()

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

    expect(screen.queryByLabelText("Entidad bancaria")).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText("Tipo de cuenta"), "ahorros")

    expect(screen.getByLabelText("Entidad bancaria")).toBeInTheDocument()

    expect(
      screen.getByText(
        "Usaremos esta informacion para revisar tu cuenta. Si editas un metodo verificado, volvera a revision."
      )
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
            breb_key: "@anaperez",
            is_default: true,
          },
        ]}
      />
    )

    expect(screen.getByText("1 guardado")).toBeInTheDocument()
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument()
    expect(screen.getByText("Principal")).toBeInTheDocument()
    expect(screen.getByText("Sin revision")).toBeInTheDocument()
    expect(screen.getByText("Llave Bre-B: @anaperez")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Editar" })
    ).toBeInTheDocument()
  })

  it("opens deletion with Cancelar focused, cycles within the confirmation and restores its opener", async () => {
    const user = userEvent.setup()
    render(<PayoutAccountsManager accounts={[{
      id: "synthetic-account", account_holder_name: "Prueba", document_number: "123",
      bank_name: "Nequi", account_type: "nequi", account_number: "3001234567", breb_key: null, is_default: true,
    }]} />)
    const opener = screen.getByRole("button", { name: "Eliminar" })
    await user.click(opener)
    const dialog = screen.getByRole("dialog", { name: "Eliminar método de retiro" })
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toHaveFocus()
    await user.tab({ shift: true })
    expect(within(dialog).getByRole("button", { name: "Eliminar" })).toHaveFocus()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(deletePayoutAccountAction).not.toHaveBeenCalled()
  })
})
