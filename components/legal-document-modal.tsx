"use client"

import type { ReactNode } from "react"
import {
  CheckCircle2,
  FileText,
  ShieldCheck,
  X,
} from "lucide-react"
import type { LegalDocument } from "@/lib/legal/documents"

type LegalDocumentModalProps<DocumentKey extends LegalDocument["id"]> = {
  documentKey: DocumentKey | null
  documents: Record<DocumentKey, LegalDocument>
  titleId: string
  onClose: () => void
  onAcceptAndContinue: () => void
}

function renderTextBlocks(paragraphs: string[] | undefined, paragraphClassName: string, listClassName: string) {
  if (!paragraphs?.length) {
    return null
  }

  const blocks: ReactNode[] = []
  let bullets: string[] = []

  function flushBullets(index: number) {
    if (bullets.length === 0) {
      return
    }

    blocks.push(
      <ul key={`bullets-${index}`} className={listClassName}>
        {bullets.map((bullet, bulletIndex) => (
          <li key={`${bullet}-${bulletIndex}`} className="list-disc">
            {bullet}
          </li>
        ))}
      </ul>
    )
    bullets = []
  }

  paragraphs.forEach((paragraph, index) => {
    if (paragraph.startsWith("- ")) {
      bullets.push(paragraph.slice(2))
      return
    }

    flushBullets(index)
    blocks.push(
      <p key={`${paragraph}-${index}`} className={paragraphClassName}>
        {paragraph}
      </p>
    )
  })

  flushBullets(paragraphs.length)

  return blocks
}

export function LegalDocumentModal<DocumentKey extends LegalDocument["id"]>({
  documentKey,
  documents,
  titleId,
  onClose,
  onAcceptAndContinue,
}: LegalDocumentModalProps<DocumentKey>) {
  if (!documentKey) {
    return null
  }

  const content = documents[documentKey]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-3 py-4 sm:px-5 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] bg-intra-card shadow-2xl">
        <div className="flex items-start gap-4 px-5 pb-4 pt-5 sm:px-8 sm:pt-7">
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-full bg-intra-success-soft text-intra-text-success sm:flex">
            <FileText className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-xl font-extrabold leading-7 text-intra-blue sm:text-3xl sm:leading-9"
            >
              {content.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-intra-blue transition hover:bg-intra-success-soft"
            aria-label="Cerrar ventana legal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mx-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-intra-border-soft bg-intra-card sm:mx-8">
          <div className="flex flex-wrap items-center gap-3 border-b border-intra-border-soft px-4 py-3 text-sm text-intra-blue">
            <FileText className="h-4 w-4 shrink-0 text-intra-text-subtle" />
            <span className="min-w-0 flex-1 truncate font-semibold">{content.shortTitle}</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-5 sm:max-h-[50vh] sm:px-10 sm:py-7">
            <div className="mx-auto max-w-3xl space-y-5">
              {content.sections.map((section) => (
                <section key={section.title} className="border-b border-intra-border-soft pb-5 last:border-b-0">
                  <h3 className="text-base font-extrabold leading-6 text-intra-blue sm:text-lg">
                    {section.title}
                  </h3>
                  <div className="mt-3 space-y-3">
                    {renderTextBlocks(
                      section.paragraphs,
                      "text-sm leading-7 text-intra-text-subtle",
                      "space-y-2 pl-5 text-sm leading-6 text-intra-text-subtle"
                    )}
                    {section.bullets ? (
                      <ul className="space-y-2 pl-5 text-sm leading-6 text-intra-text-subtle">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="list-disc">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {section.groups?.map((group) => (
                      <div key={group.title} className="rounded-2xl bg-intra-bg-app p-4">
                        <h4 className="text-sm font-bold text-intra-blue">{group.title}</h4>
                        <div className="mt-2 space-y-2">
                          {renderTextBlocks(
                            group.paragraphs,
                            "text-sm leading-6 text-intra-text-subtle",
                            "space-y-2 pl-5 text-sm leading-6 text-intra-text-subtle"
                          )}
                          {group.bullets ? (
                            <ul className="space-y-2 pl-5 text-sm leading-6 text-intra-text-subtle">
                              {group.bullets.map((bullet) => (
                                <li key={bullet} className="list-disc">
                                  {bullet}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="flex h-10 shrink-0 items-center gap-2 border-t border-intra-border-soft bg-intra-neutral-soft-alt px-4 py-0 text-xs text-intra-text-subtle sm:h-auto sm:py-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-intra-text-success" />
            <span className="flex min-w-0 flex-col leading-4 sm:inline sm:leading-normal">
              <span>Documento v{content.version}.</span>
              <span>
                Última actualización:{" "}
                <span className="font-semibold text-intra-text-success">{content.updatedAtLabel}</span>
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8 sm:py-5">
          <div className="flex justify-center gap-3 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="hidden min-h-11 flex-1 items-center justify-center rounded-2xl border border-intra-border-soft bg-intra-card px-5 py-2 text-sm font-bold text-intra-blue transition hover:bg-intra-bg-app sm:inline-flex sm:flex-none"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={onAcceptAndContinue}
              className="inline-flex min-h-11 w-full max-w-[19rem] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-intra-green px-8 py-2 text-sm font-bold text-intra-card transition hover:bg-intra-green-hover sm:w-auto sm:max-w-none sm:flex-none sm:px-5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Acepto y continúo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
