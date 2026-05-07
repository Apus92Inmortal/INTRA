"use client";

import { useState } from "react";

type TrackingCodeBadgeProps = {
  code: string;
  className?: string;
};

export function TrackingCodeBadge({ code, className = "" }: TrackingCodeBadgeProps) {
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

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={`inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800 ${className}`.trim()}
      title="Copiar tracking"
    >
      <span>{code}</span>
      <span className="text-[10px] font-medium text-slate-300">{copied ? "Copiado" : "Copiar"}</span>
    </button>
  );
}
