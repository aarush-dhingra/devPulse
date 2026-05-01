import { useEffect } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-white/10 bg-bg-card p-5 flex flex-col max-h-[calc(100vh-2rem)] overflow-hidden shadow-deep"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="shrink-0 flex items-center justify-between mb-3 pb-3 border-b border-white/[0.06]">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              className="text-ink-muted hover:text-ink p-1 rounded-lg"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
        {footer && (
          <div className="shrink-0 mt-4 pt-3 border-t border-white/[0.06] flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
