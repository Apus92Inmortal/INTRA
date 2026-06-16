"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { X, ZoomIn } from "lucide-react";

type EvidenceImagePreviewProps = {
  src: string | null;
  alt: string;
  children: ReactNode;
  modalTitle?: string;
};

export function EvidenceImagePreview({
  src,
  alt,
  children,
  modalTitle = "Evidencia del envío",
}: EvidenceImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) {
    return <>{children}</>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative block text-left"
        aria-label={`Abrir ${alt}`}
      >
        {children}
        <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-intra-blue/90 text-intra-card opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <ZoomIn className="h-4 w-4" strokeWidth={2} />
        </span>
      </button>

      {isOpen ? (
        <div
          className="intra-modal-backdrop p-4"
          role="dialog"
          aria-modal="true"
          aria-label={modalTitle}
        >
          <div className="intra-modal-panel relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-intra-border px-4 py-3">
              <p className="min-w-0 intra-caption-strong text-intra-blue">{modalTitle}</p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="intra-icon-button h-10 w-10 shrink-0"
                aria-label="Cerrar imagen"
              >
                <X className="h-5 w-5" strokeWidth={2.2} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-intra-neutral-soft-alt p-3 sm:p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-h-[78vh] max-w-full rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
