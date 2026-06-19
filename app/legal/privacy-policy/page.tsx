import type { Metadata } from "next";
import { PublicLegalDocumentPage } from "@/app/legal/_components/PublicLegalDocumentPage";
import { PRIVACY_POLICY_DOCUMENT } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "Política de Privacidad | INTRA",
  description: PRIVACY_POLICY_DOCUMENT.intro,
};

export default function PrivacyPolicyPage() {
  return <PublicLegalDocumentPage document={PRIVACY_POLICY_DOCUMENT} />;
}
