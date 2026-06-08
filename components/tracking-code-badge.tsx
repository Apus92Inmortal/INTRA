"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type TrackingCodeBadgeProps = {
  code: string;
  className?: string;
  variant?: "dark" | "light";
};

export function TrackingCodeBadge({ code, className = "", variant = "dark" }: TrackingCodeBadgeProps) {
  const [copied, setCopied] = useState(false);
  const copiedLabel = "Copiado";
  const layoutLabel = code.length >= copiedLabel.length ? code : copiedLabel;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const toneClasses =
    variant === "light"
      ? "border border-intra-border-soft bg-intra-card text-intra-blue hover:bg-intra-bg-app"
      : "bg-intra-blue text-intra-card hover:bg-intra-blue-hover-card";

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`intra-pill intra-badge-text min-w-[108px] text-center transition ${toneClasses} ${className}`.trim()}
      title="Copiar tracking"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="grid place-items-center">
        <span className="invisible col-start-1 row-start-1">{layoutLabel}</span>
        <span className="col-start-1 row-start-1">{copied ? copiedLabel : code}</span>
      </span>
    </button>
  );
}
