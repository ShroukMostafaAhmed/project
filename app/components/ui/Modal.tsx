"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ModalProps {
  open:     boolean;
  onClose:  () => void;
  title:    string;
  children: React.ReactNode;
  size?:    "sm" | "md" | "lg";
}

const sizeMap = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export default function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "fadeBackdrop .2s ease" }}
      />

      {/* Panel */}
      <div
        className={cn("relative w-full rounded-2xl overflow-hidden shadow-2xl", sizeMap[size])}
        style={{
          background:  "var(--card)",
          border:      "1px solid var(--card-border)",
          animation:   "slideModal .22s cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--card-border)", background: "rgba(128,128,128,0.04)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(128,128,128,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5" style={{ color: "var(--foreground)" }}>{children}</div>
      </div>

      <style>{`
        @keyframes fadeBackdrop  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideModal    {
          from { opacity:0; transform:scale(.96) translateY(8px) }
          to   { opacity:1; transform:scale(1)   translateY(0) }
        }
      `}</style>
    </div>
  );
}
