import type { Metadata } from "next";
import { PublicLegalDocumentPage } from "@/app/legal/_components/PublicLegalDocumentPage";
import { TERMS_CONDITIONS_DOCUMENT } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "Términos y Condiciones | INTRA",
  description: TERMS_CONDITIONS_DOCUMENT.intro,
};

export default function TermsConditionsPage() {
  return <PublicLegalDocumentPage document={TERMS_CONDITIONS_DOCUMENT} />;
}
