"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Info, CheckCircle2, Trash2, Loader2 } from "lucide-react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  type?: "danger" | "info" | "success" | "warning";
  confirmLabel?: string;
  onConfirm?: () => void;
  loading?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  type = "info",
  confirmLabel,
  onConfirm,
  loading = false,
}: ModalProps) {
  // Lock scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const icons = {
    danger: <Trash2 className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-amber-500" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    warning: <AlertCircle className="w-5 h-5 text-orange-500" />,
  };
  
  const colors = {
    danger: "bg-red-500/10 border border-red-500/20",
    info: "bg-amber-500/10 border border-amber-500/20",
    success: "bg-emerald-500/10 border border-emerald-500/20",
    warning: "bg-orange-500/10 border border-orange-500/20",
  };
  
  const buttonColors = {
    danger: "bg-red-600 hover:bg-red-500 shadow-red-500/20",
    info: "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black",
    success: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20",
    warning: "bg-orange-600 hover:bg-orange-500 shadow-orange-500/20",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            className="relative w-full max-w-md bg-card rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] overflow-hidden border border-border"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl shrink-0 ${colors[type]}`}>
                  {icons[type]}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground tracking-tight">
                    {title}
                  </h3>
                  {description && (
                    <p className="mt-2 text-[10px] font-bold text-slate-600 dark:text-slate-500 leading-relaxed uppercase tracking-widest">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-colors text-slate-400 hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {children && <div className="mt-6">{children}</div>}

              <div className="mt-8 flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-3 rounded-2xl border border-border text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                {onConfirm && (
                  <button
                    onClick={onConfirm}
                    disabled={loading}
                    className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${buttonColors[type]}`}
                  >
                    {loading && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {confirmLabel || "Confirmar"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
