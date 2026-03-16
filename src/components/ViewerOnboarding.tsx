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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden relative"
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 px-10 pt-4">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-indigo-500' : 'bg-slate-100'}`} 
              />
            ))}
          </div>

          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-10 pt-14">
            <div className="flex flex-col items-center text-center">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6"
              >
                {(() => {
                  const Icon = steps[currentStep].icon;
                  return <Icon className="w-8 h-8" />;
                })()}
              </motion.div>

              <motion.h2 
                key={`t-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-2xl font-extrabold text-slate-900 tracking-tight"
              >
                {steps[currentStep].title}
              </motion.h2>
              
              <motion.p 
                key={`d-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-slate-500 mt-3 text-sm leading-relaxed"
              >
                {steps[currentStep].description}
              </motion.p>
            </div>

            <div className="mt-10">
              <button
                onClick={next}
                className="w-full group flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-all shadow-[0_12px_24px_-8px_rgba(79,70,229,0.4)] active:scale-95"
              >
                <span>{currentStep === steps.length - 1 ? "Comenzar" : "Siguiente"}</span>
                {currentStep === steps.length - 1 ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
