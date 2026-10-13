import { StrictMode } from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import SecurityClient from "@/app/app/profile/security/SecurityClient"

const auth = vi.hoisted(() => ({
  listFactors: vi.fn(), enroll: vi.fn(), challengeAndVerify: vi.fn(), getClaims: vi.fn(),
  replace: vi.fn(), refresh: vi.fn(), onAuthStateChange: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: auth.replace, refresh: auth.refresh }) }))
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: {
  mfa: { listFactors: auth.listFactors, enroll: auth.enroll, challengeAndVerify: auth.challengeAndVerify },
  getClaims: auth.getClaims,
  onAuthStateChange: auth.onAuthStateChange,
} }) }))
vi.mock("next/image", () => ({ default: (props: { src: string; alt: string }) => (
  // Synthetic QR only; no screenshot, real secret or optimized network image.
  // eslint-disable-next-line @next/next/no-img-element
  <img src={props.src} alt={props.alt} />
) }))

const factor = { id: "synthetic-factor", factor_type: "totp", status: "verified" }
const emptyFactors = { data: { all: [], totp: [], phone: [], webauthn: [] }, error: null }
const verifiedFactors = { data: { all: [factor], totp: [factor], phone: [], webauthn: [] }, error: null }
const claims = (aal: string) => ({ data: { claims: { sub: "synthetic-admin", aal } }, error: null })

describe("admin MFA enrollment and challenge", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    auth.listFactors.mockResolvedValue(emptyFactors)
    auth.getClaims.mockResolvedValue(claims("aal1"))
    auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    auth.enroll.mockResolvedValue({ data: {
      id: factor.id, type: "totp", totp: {
        qr_code: 'data:image/svg+xml;utf-8,<?xml version="1.0"?>\n<!-- Generated SVG -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        secret: "unused-synthetic-secret", uri: "synthetic-unused-uri",
      },
    }, error: null })
  })

  it("does not enroll on render/prefetch/StrictMode and shows a private QR only after the explicit CTA", async () => {
    const user = userEvent.setup()
    render(<StrictMode><SecurityClient userId="synthetic-admin" /></StrictMode>)
    const activate = await screen.findByRole("button", { name: "Activar verificación" })
    expect(auth.enroll).not.toHaveBeenCalled()
    await user.click(activate)
    expect(await screen.findByRole("img", { name: "Código QR privado para activar la verificación" })).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml"))
    expect(screen.queryByText("unused-synthetic-secret")).not.toBeInTheDocument()
    expect(screen.queryByText("synthetic-unused-uri")).not.toBeInTheDocument()
    expect(auth.enroll).toHaveBeenCalledTimes(1)
  })

  it("fails closed when Auth cannot load factors and suppresses raw provider errors", async () => {
    auth.listFactors.mockResolvedValue({ data: null, error: { message: "private-provider-debug" } })
    render(<SecurityClient userId="synthetic-admin" />)
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar la verificación")
    expect(screen.queryByText("private-provider-debug")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Activar verificación" })).not.toBeInTheDocument()
    expect(auth.enroll).not.toHaveBeenCalled()
  })

  it("handles the provider limit without deleting existing factors or encouraging immediate retries", async () => {
    const user = userEvent.setup()
    auth.enroll.mockResolvedValue({ data: null, error: {
      code: "too_many_enrolled_mfa_factors", message: "private-factor-debug",
    } })
    render(<SecurityClient userId="synthetic-admin" />)
    await user.click(await screen.findByRole("button", { name: "Activar verificación" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Hay varias activaciones pendientes")
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.queryByText("private-factor-debug")).not.toBeInTheDocument()
    expect(auth.replace).not.toHaveBeenCalled()
  })

  it("rejects an incorrect code without navigating or exposing the backend error", async () => {
    const user = userEvent.setup()
    auth.listFactors.mockResolvedValue(verifiedFactors)
    auth.challengeAndVerify.mockResolvedValue({ data: null, error: { message: "private-code-debug" } })
    render(<SecurityClient userId="synthetic-admin" />)
    const input = await screen.findByLabelText("Código de autenticación")
    await user.type(input, "000001")
    await user.click(screen.getByRole("button", { name: "Verificar código" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos verificar el código")
    expect(input).toHaveValue("")
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(screen.queryByText("private-code-debug")).not.toBeInTheDocument()
    expect(auth.replace).not.toHaveBeenCalled()
    expect(auth.refresh).not.toHaveBeenCalled()
  })

  it("shows an inline error for an incomplete code before attempting a challenge", async () => {
    const user = userEvent.setup()
    auth.listFactors.mockResolvedValue(verifiedFactors)
    render(<SecurityClient userId="synthetic-admin" />)
    await user.type(await screen.findByLabelText("Código de autenticación"), "001")
    await user.click(screen.getByRole("button", { name: "Verificar código" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("seis dígitos")
    expect(auth.challengeAndVerify).not.toHaveBeenCalled()
    expect(auth.replace).not.toHaveBeenCalled()
  })

  it("does not trust verification success when the current verified JWT still has aal1", async () => {
    const user = userEvent.setup()
    auth.challengeAndVerify.mockResolvedValue({ data: {}, error: null })
    render(<SecurityClient userId="synthetic-admin" />)
    await user.click(await screen.findByRole("button", { name: "Activar verificación" }))
    await user.type(await screen.findByLabelText("Código de autenticación"), "000001")
    auth.listFactors.mockResolvedValue(verifiedFactors)
    await user.click(screen.getByRole("button", { name: "Verificar código" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos confirmar la verificación")
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Activar verificación" })).not.toBeInTheDocument()
    expect(auth.replace).not.toHaveBeenCalled()
  })

  it("clears the QR and refreshes navigation only after verified factor and aal2 checks", async () => {
    const user = userEvent.setup()
    auth.challengeAndVerify.mockResolvedValue({ data: {}, error: null })
    render(<SecurityClient userId="synthetic-admin" />)
    await user.click(await screen.findByRole("button", { name: "Activar verificación" }))
    await user.type(await screen.findByLabelText("Código de autenticación"), "000001")
    auth.listFactors.mockResolvedValue(verifiedFactors)
    auth.getClaims.mockResolvedValue(claims("aal2"))
    await user.click(screen.getByRole("button", { name: "Verificar código" }))
    await waitFor(() => expect(auth.replace).toHaveBeenCalledWith("/app/admin"))
    expect(auth.refresh).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Código de autenticación")).not.toBeInTheDocument()
  })

  it("refuses enrollment after the browser changes to another account", async () => {
    const user = userEvent.setup()
    render(<SecurityClient userId="synthetic-admin" />)
    const activate = await screen.findByRole("button", { name: "Activar verificación" })
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "another-user", aal: "aal1" } }, error: null })
    await user.click(activate)
    expect(await screen.findByRole("alert")).toHaveTextContent("Tu sesión cambió")
    expect(auth.enroll).not.toHaveBeenCalled()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("cannot reintroduce a delayed private QR after sign-out", async () => {
    const user = userEvent.setup()
    let completeEnrollment!: (result: unknown) => void
    const lateResponse = auth.enroll.getMockImplementation()!()
    auth.enroll.mockReturnValue(new Promise(resolve => { completeEnrollment = resolve }))
    render(<SecurityClient userId="synthetic-admin" />)
    await user.click(await screen.findByRole("button", { name: "Activar verificación" }))
    await waitFor(() => expect(auth.enroll).toHaveBeenCalledTimes(1))
    const authListener = auth.onAuthStateChange.mock.calls[0][0]
    act(() => authListener("SIGNED_OUT", null))
    await act(async () => { completeEnrollment(await lateResponse) })
    expect(screen.getByRole("alert")).toHaveTextContent("Tu sesión cambió")
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Código de autenticación")).not.toBeInTheDocument()
    expect(auth.replace).not.toHaveBeenCalled()
  })
})
