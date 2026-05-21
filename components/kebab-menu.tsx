"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

type KebabMenuItem = {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
};

type KebabMenuProps = {
  label: string;
  items: KebabMenuItem[];
  align?: "left" | "right";
};

export function KebabMenu({ label, items, align = "right" }: KebabMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-intra-border-strong bg-intra-card text-intra-blue shadow-sm transition hover:bg-intra-bg-app focus:outline-none focus:ring-2 focus:ring-intra-blue/25"
      >
        <MoreVertical className="intra-icon-body" strokeWidth={2} />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className={`absolute top-12 z-30 min-w-48 rounded-2xl border border-intra-border-strong bg-intra-card p-1.5 text-left shadow-[0_18px_45px_rgba(11,44,74,0.16)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                item.onSelect();
              }}
              className={`w-full rounded-xl px-3 py-2 text-left text-[14px] font-semibold leading-5 transition ${
                item.tone === "danger"
                  ? "text-intra-danger hover:bg-intra-danger-soft"
                  : "text-intra-blue hover:bg-intra-bg-app"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
