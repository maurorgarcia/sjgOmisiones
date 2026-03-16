"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Info, CheckCircle2, Trash2 } from "lucide-react";
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
    danger: <Trash2 className="w-6 h-6 text-red-600" />,
    info: <Info className="w-6 h-6 text-blue-600" />,
    success: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
    warning: <AlertCircle className="w-6 h-6 text-amber-600" />,
  };

  const colors = {
    danger: "bg-red-50",
    info: "bg-blue-50",
    success: "bg-emerald-50",
    warning: "bg-amber-50",
  };

  const buttonColors = {
    danger: "bg-red-600 hover:bg-red-700 shadow-red-500/20",
    info: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20",
    success: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20",
    warning: "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20",
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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${colors[type]}`}>
                  {icons[type]}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {title}
                  </h3>
                  {description && (
                    <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {children && <div className="mt-6">{children}</div>}

              <div className="mt-8 flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                {onConfirm && (
                  <button
                    onClick={onConfirm}
                    disabled={loading}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2 ${buttonColors[type]}`}
                  >
                    {loading && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
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
