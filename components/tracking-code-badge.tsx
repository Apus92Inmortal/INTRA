"use client";

import { useState } from "react";

type TrackingCodeBadgeProps = {
  code: string;
  className?: string;
  variant?: "dark" | "light";
};

export function TrackingCodeBadge({ code, className = "", variant = "dark" }: TrackingCodeBadgeProps) {
  const [copied, setCopied] = useState(false);

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
      ? "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
      : "bg-slate-900 text-white hover:bg-slate-800";

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`inline-flex min-w-[108px] items-center justify-center rounded-full px-3 py-1 text-center text-xs font-semibold transition ${toneClasses} ${className}`.trim()}
      title="Copiar tracking"
    >
      <span>{copied ? "Copiado" : code}</span>
    </button>
  );
}
