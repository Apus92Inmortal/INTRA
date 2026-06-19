import { render, screen } from "@testing-library/react";
import PrivacyPolicyPage from "@/app/legal/privacy-policy/page";
import TermsConditionsPage from "@/app/legal/terms-conditions/page";

describe("Public legal pages", () => {
  it("renders the public terms and conditions document", () => {
    render(<TermsConditionsPage />);

    expect(
      screen.getByRole("heading", { name: "Términos y Condiciones" })
    ).toBeInTheDocument();
    expect(screen.getByText(/regulan el acceso y uso de INTRA/i)).toBeInTheDocument();
  });

  it("renders the public privacy policy document", () => {
    render(<PrivacyPolicyPage />);

    expect(
      screen.getByRole("heading", { name: "Política de Privacidad" })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/tratamiento de datos personales/i).length).toBeGreaterThan(0);
  });
});
