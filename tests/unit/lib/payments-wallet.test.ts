import { describe, expect, it } from "vitest"

import {
  getCompactPayoutAccountLabel,
  getPayoutAccountDisplayName,
  getPayoutInstitutionLabel,
} from "@/lib/payments/wallet"

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

describe("getPayoutInstitutionLabel", () => {
  it("keeps only the institution name for bank accounts", () => {
    expect(
      getPayoutInstitutionLabel({ account_type: "ahorros", bank_name: "Banco de Bogotá" })
    ).toBe("Banco de Bogotá")
  })
})

describe("getCompactPayoutAccountLabel", () => {
  it("keeps only bank name and masked account number", () => {
    expect(
      getCompactPayoutAccountLabel({
        account_type: "ahorros",
        bank_name: "Banco de Bogotá",
        account_number: "1234567890",
      })
    ).toBe("Banco de Bogotá · ••••••7890")
  })
})
