import { describe, expect, it } from "vitest"

import { getPayoutAccountDisplayName } from "@/lib/payments/wallet"

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
