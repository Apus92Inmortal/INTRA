"use client";

import { useEffect, useRef, type RefObject } from "react";

type ModalEntry = {
  panel: HTMLElement;
  returnFocus: HTMLElement | null;
  lastFocused: HTMLElement | null;
};

const modalStack: ModalEntry[] = [];
let previousBodyOverflow = "";

function isAvailable(element: HTMLElement) {
  if (!element.isConnected || element.closest("[hidden], [inert], [aria-hidden='true']") || element.matches(":disabled")) {
    return false;
  }

  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    const style = window.getComputedStyle(ancestor);
    if (style.display === "none" || style.visibility === "hidden") return false;
  }

  return true;
}

function tabbableElements(panel: HTMLElement) {
  return Array.from(panel.querySelectorAll<HTMLElement>(
    "a[href], area[href], button, input:not([type='hidden']), select, textarea, iframe, summary, [tabindex], [contenteditable='true']"
  ))
    .filter((element) => element.tabIndex >= 0 && isAvailable(element))
    .sort((a, b) => {
      // Positive tabindex values precede the normal DOM order.
      const aIndex = a.tabIndex > 0 ? a.tabIndex : Number.MAX_SAFE_INTEGER;
      const bIndex = b.tabIndex > 0 ? b.tabIndex : Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
}

function focusInside(entry: ModalEntry) {
  const target = entry.lastFocused && entry.panel.contains(entry.lastFocused) && isAvailable(entry.lastFocused)
    ? entry.lastFocused
    : tabbableElements(entry.panel)[0] ?? entry.panel;
  target.focus({ preventScroll: true });
}

/** Keeps keyboard interaction inside the top modal and restores its opener on close. */
export function useModalFocus<T extends HTMLElement = HTMLDivElement>({
  open,
  onDismiss,
  initialFocusRef,
}: {
  open: boolean;
  onDismiss?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const panelRef = useRef<T>(null);
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;

    const entry: ModalEntry = {
      panel,
      returnFocus: document.activeElement instanceof HTMLElement ? document.activeElement : null,
      lastFocused: null,
    };

    if (modalStack.length === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    modalStack.push(entry);

    function handleFocus(event: FocusEvent) {
      if (modalStack.at(-1) !== entry) return;
      if (event.target instanceof HTMLElement && panel!.contains(event.target)) {
        entry.lastFocused = event.target;
      } else {
        focusInside(entry);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (modalStack.at(-1) !== entry) return;

      if (event.key === "Escape") {
        // Consume Escape even while dismissal is disabled, so an outer dialog cannot close.
        event.preventDefault();
        event.stopImmediatePropagation();
        dismissRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;
      const elements = tabbableElements(panel!);
      const first = elements[0];
      const last = elements.at(-1);
      const active = document.activeElement;

      if (!first || !last) {
        event.preventDefault();
        panel!.focus({ preventScroll: true });
      } else if (event.shiftKey && (active === first || !elements.includes(active as HTMLElement))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || !elements.includes(active as HTMLElement))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("keydown", handleKeyDown, true);
    const initialTarget = initialFocusRef?.current;
    if (initialTarget && panel.contains(initialTarget) && isAvailable(initialTarget)) {
      initialTarget.focus({ preventScroll: true });
    } else {
      focusInside(entry);
    }

    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("keydown", handleKeyDown, true);
      const wasTop = modalStack.at(-1) === entry;
      const index = modalStack.indexOf(entry);
      if (index !== -1) modalStack.splice(index, 1);
      // If a parent disappears while its child is open, preserve the original return target.
      for (const remaining of modalStack) {
        if (remaining.returnFocus && panel.contains(remaining.returnFocus)) {
          remaining.returnFocus = entry.returnFocus;
        }
      }
      if (modalStack.length === 0) document.body.style.overflow = previousBodyOverflow;

      if (wasTop) {
        const parent = modalStack.at(-1);
        if (entry.returnFocus && isAvailable(entry.returnFocus) && (!parent || parent.panel.contains(entry.returnFocus))) {
          entry.returnFocus.focus({ preventScroll: true });
        } else if (parent) {
          focusInside(parent);
        }
      }
    };
  }, [open, initialFocusRef]);

  return panelRef;
}
