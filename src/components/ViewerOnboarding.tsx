"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  ChevronRight, 
  CheckCircle2, 
  X,
  Eye,
  ClipboardList
} from "lucide-react";

interface Step {
  title: string;
  description: string;
  icon: any;
}

const steps: Step[] = [
  {
    title: "Vista de Reportes",
    description: "Como visor, tenés acceso completo a las estadísticas y el historial de omisiones detectadas.",
    icon: FileText
  },
  {
    title: "Búsqueda Inteligente",
    description: "Usá la barra de búsqueda para encontrar registros por nombre, legajo o número de OT al instante.",
    icon: Search
  },
  {
    title: "Filtros Avanzados",
    description: "Filtrá por fecha, motivo o sector para analizar segmentaciones específicas de los datos.",
    icon: Filter
  },
  {
    title: "Exportación Directa",
    description: "Podés descargar los reportes en formato Excel siempre que lo necesites para tu gestión externa.",
    icon: Download
  },
  {
    title: "Sección Faltantes",
    description: "Nueva sección dedicada exclusivamente a registrar personal que no figura en el sistema.",
    icon: ClipboardList
  }
];

export function ViewerOnboarding({ show, onClose }: { show: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!show) return null;

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#111418] rounded-[3rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] border border-white/10 w-full max-w-md overflow-hidden relative"
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 px-12 pt-6">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all duration-700 ${i <= currentStep ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-white/5'}`} 
              />
            ))}
          </div>

          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-2.5 text-slate-500 hover:text-white rounded-2xl hover:bg-white/5 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-10 pt-14">
            <div className="flex flex-col items-center text-center">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mb-8 border border-amber-500/20 shadow-inner"
              >
                {(() => {
                  const Icon = steps[currentStep].icon;
                  return <Icon className="w-10 h-10" />;
                })()}
              </motion.div>

              <motion.h2 
                key={`t-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-black text-white tracking-tight uppercase"
              >
                {steps[currentStep].title}
              </motion.h2>
              
              <motion.p 
                key={`d-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-slate-500 mt-4 text-[13px] leading-relaxed font-medium"
              >
                {steps[currentStep].description}
              </motion.p>
            </div>

            <div className="mt-12">
              <button
                onClick={next}
                className="w-full group flex items-center justify-center gap-3 py-5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 shadow-amber-900/40"
              >
                <span>{currentStep === steps.length - 1 ? "Comenzar" : "Siguiente"}</span>
                {currentStep === steps.length - 1 ? (
                  <CheckCircle2 className="w-5 h-5 opacity-70" />
                ) : (
                  <ChevronRight className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                )}
              </button>
              
              <div className="mt-4 flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Modo Visor</span>
                </div>
                <span>SJG Gestiones</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
