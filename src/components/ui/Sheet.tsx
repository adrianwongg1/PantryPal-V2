"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

// Built on the native <dialog> element rather than a portal plus a hand-
// rolled focus trap: showModal()/close() give us the top layer, focus
// trapping, Escape-to-close, and an inert background for free. One
// implementation, reused by every bottom-sheet/modal surface in the design
// (5c's "Add to the list?", 6b's day picker, 7b's ingredient drawer, any
// confirm dialog) rather than three separate ones.
export function Sheet({ open, onClose, title, children, actions, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={["dialog", className].filter(Boolean).join(" ")}
      onClose={onClose}
      onClick={(event) => {
        // A click landing on the <dialog> element itself, not on any of its
        // content, is a click on the backdrop area — <dialog>'s own click
        // target there, since ::backdrop isn't a real DOM node to bind to.
        if (event.target === ref.current) onClose();
      }}
    >
      {title ? <div className="dialog-title">{title}</div> : null}
      <div className="dialog-body">{children}</div>
      {actions ? <div className="dialog-actions">{actions}</div> : null}
    </dialog>
  );
}
