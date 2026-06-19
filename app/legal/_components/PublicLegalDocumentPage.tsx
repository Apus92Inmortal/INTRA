import Link from "next/link";
import type { LegalDocument, LegalDocumentSection } from "@/lib/legal/documents";

type PublicLegalDocumentPageProps = {
  document: LegalDocument;
};

function LegalSection({ section }: { section: LegalDocumentSection }) {
  return (
    <article className="border-b border-intra-border px-5 py-6 last:border-b-0 sm:px-7 sm:py-7">
      <h2 className="intra-subtitle text-intra-blue">{section.title}</h2>

      <div className="mt-3 space-y-3">
        {section.paragraphs?.map((paragraph, index) => (
          <p
            key={`${section.title}-paragraph-${index}`}
            className="intra-body text-intra-text-subtle"
          >
            {paragraph}
          </p>
        ))}

        {section.bullets ? (
          <ul className="list-disc space-y-2 pl-5">
            {section.bullets.map((bullet, index) => (
              <li
                key={`${section.title}-bullet-${index}`}
                className="intra-body text-intra-text-subtle"
              >
                {bullet}
              </li>
            ))}
          </ul>
        ) : null}

        {section.groups?.map((group, groupIndex) => (
          <div
            key={`${section.title}-group-${groupIndex}`}
            className="rounded-[var(--intra-radius-xs)] bg-intra-bg-app p-4"
          >
            <h3 className="intra-body-strong text-intra-blue">{group.title}</h3>
            <div className="mt-2 space-y-2">
              {group.paragraphs?.map((paragraph, index) => (
                <p
                  key={`${group.title}-paragraph-${index}`}
                  className="intra-body text-intra-text-subtle"
                >
                  {paragraph}
                </p>
              ))}
              {group.bullets ? (
                <ul className="list-disc space-y-2 pl-5">
                  {group.bullets.map((bullet, index) => (
                    <li
                      key={`${group.title}-bullet-${index}`}
                      className="intra-body text-intra-text-subtle"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function PublicLegalDocumentPage({ document }: PublicLegalDocumentPageProps) {
  return (
    <main className="min-h-screen bg-intra-bg-landing px-4 py-5 text-intra-blue sm:px-6 sm:py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <Link
          href="/"
          className="inline-flex w-fit items-center rounded-[var(--intra-radius-pill)] border border-intra-border bg-intra-card px-4 py-2 intra-caption-strong text-intra-blue shadow-sm transition hover:border-intra-green hover:text-intra-text-success"
        >
          Volver al inicio
        </Link>

        <section className="rounded-[var(--intra-radius-md)] bg-intra-blue px-5 py-7 text-intra-card shadow-[var(--intra-shadow-hero)] sm:px-8 sm:py-9">
          <p className="intra-badge-text uppercase text-intra-card/70">Documento legal</p>
          <h1 className="mt-3 intra-title text-intra-card">{document.title}</h1>
          <p className="mt-3 max-w-3xl intra-body text-intra-card/75">{document.intro}</p>
          <div className="mt-5 flex flex-col gap-2 intra-caption text-intra-card/70 sm:flex-row sm:items-center">
            <span>Versión {document.version}</span>
            <span className="hidden text-intra-card/40 sm:inline">|</span>
            <span>Actualizado: {document.updatedAtLabel}</span>
          </div>
        </section>

        <section className="overflow-hidden rounded-[var(--intra-radius-md)] border border-intra-border bg-intra-card shadow-[var(--intra-shadow-base)]">
          {document.sections.map((section) => (
            <LegalSection key={section.title} section={section} />
          ))}
        </section>
      </div>
    </main>
  );
}
