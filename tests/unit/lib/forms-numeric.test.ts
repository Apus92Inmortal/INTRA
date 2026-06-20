import { describe, expect, it } from "vitest"
import {
  formatThousands,
  parseIntegerWithThousands,
  parseNormalizedNumber,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
} from "@/lib/forms/numeric"

describe("numeric form helpers", () => {
  it("normalizes decimal input and keeps a single decimal separator", () => {
    expect(sanitizeDecimalInput("1,5")).toBe("1.5")
    expect(sanitizeDecimalInput("2..5kg")).toBe("2.5")
    expect(sanitizeDecimalInput("abc3.75")).toBe("3.75")
  })

  it("keeps only digits for integer input", () => {
    expect(sanitizeIntegerInput("20.000 COP")).toBe("20000")
  })

  it("formats integers with thousands separators (Colombian style)", () => {
    expect(formatThousands("1000")).toBe("1.000")
    expect(formatThousands("1000000")).toBe("1.000.000")
    expect(formatThousands("abc 50000 xyz")).toBe("50.000")
    expect(formatThousands("")).toBe("")
  })

  it("parses integers with thousands separators", () => {
    expect(parseIntegerWithThousands("1.000.000")).toBe(1000000)
    expect(parseIntegerWithThousands("50.000")).toBe(50000)
    expect(parseIntegerWithThousands("")).toBeNull()
  })

  it("parses normalized numbers safely", () => {
    expect(parseNormalizedNumber("1.5")).toBe(1.5)
    expect(parseNormalizedNumber("20000")).toBe(20000)
    expect(parseNormalizedNumber("")).toBeNull()
    expect(parseNormalizedNumber("abc")).toBeNull()
  })
})
