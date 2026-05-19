import { describe, expect, it } from "vitest"

import {
  getCompactPayoutAccountLabel,
  getPayoutAccountDisplayName,
  getPayoutInstitutionLabel,
} from "@/lib/payments/wallet"

describe("getPayoutInstitutionLabel", () => {
  it("shows only the institution name for the primary account summary", () => {
    expect(
      getPayoutInstitutionLabel({ account_type: "ahorros", bank_name: "Banco de Bogotá" })
    ).toBe("Banco de Bogotá")
  })
})

describe("getPayoutAccountDisplayName", () => {
  it("keeps wallet labels simple for nequi/daviplata", () => {
    expect(
      getPayoutAccountDisplayName({ account_type: "nequi", bank_name: "Nequi" })
    ).toBe("Nequi")
  })

  it("includes bank name and account type for bank accounts", () => {
    expect(
      getPayoutAccountDisplayName({ account_type: "ahorros", bank_name: "Bancolombia" })
    ).toBe("Bancolombia · Cuenta de ahorros")
  })
})

describe("getCompactPayoutAccountLabel", () => {
  it("shows only institution and masked account number for selects", () => {
    expect(
      getCompactPayoutAccountLabel({
        account_type: "ahorros",
        bank_name: "Banco de Bogotá",
        account_number: "123451924",
      })
    ).toBe("Banco de Bogotá · •••••1924")
  })
})
