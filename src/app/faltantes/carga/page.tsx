"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Save, Loader2, ArrowLeft, Calendar, Building2, FileText, Hash, Search, X, Maximize2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CONTRATOS, SECTORES_FALTANTES, MOTIVOS_FALTANTES } from "@/types";

type Empleado = {
  nombre_apellido: string;
  legajo: string;
  contrato: string;
};

export default function CargaFaltantePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Autocomplete
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Empleado[]>([]);
  const [selectedEmpleados, setSelectedEmpleados] = useState<Empleado[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [contrato, setContrato] = useState("");
  const [sector, setSector] = useState("");
  const [motivo, setMotivo] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = sessionStorage.getItem("sjg_working_date");
    if (saved) setFecha(saved);

    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const updateFecha = (val: string) => {
    setFecha(val);
    sessionStorage.setItem("sjg_working_date", val);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    
    if (searchTimer.current) clearTimeout(searchTimer.current);
    
    if (!val.trim() || val.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from("empleados")
        .select("nombre_apellido, legajo, contrato")
        .or(`nombre_apellido.ilike.%${val}%,legajo.ilike.%${val}%`)
        .limit(8);
      setSuggestions(data || []);
      setShowSuggestions(true);
      setSearchLoading(false);
    }, 300);
  };

  const selectEmpleado = (emp: Empleado) => {
    if (selectedEmpleados.some(e => e.legajo === emp.legajo)) {
      toast.error("Este empleado ya está en la lista.");
      return;
    }
    setSelectedEmpleados([...selectedEmpleados, emp]);
    setSearchQuery("");
    if (!contrato) setContrato(emp.contrato);
    setSuggestions([]);
    setShowSuggestions(false);
    setErrors(e => ({ ...e, nombre: "" }));
  };

  const removeEmpleado = (legajo: string) => {
    setSelectedEmpleados(prev => prev.filter(e => e.legajo !== legajo));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!fecha) newErrors.fecha = "Requerido";
    if (!contrato) newErrors.contrato = "Requerido";
    
    const hasEmployees = selectedEmpleados.length > 0 || searchQuery.trim();
    if (!hasEmployees) newErrors.nombre = "Debe seleccionar al menos un empleado.";
    
    if (!sector.trim() && !motivo.trim()) {
      toast.error("Debe ingresar al menos un Sector o un Motivo.");
      return false;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    
    const fechaISO = `${fecha}T12:00:00.000Z`;
    const employeesToSave = selectedEmpleados.length > 0 
      ? selectedEmpleados 
      : [{ nombre_apellido: searchQuery.trim(), legajo: "" }];

    const entriesToSave = employeesToSave.map(emp => ({
      fecha: fechaISO,
      contrato,
      nombre_apellido: emp.nombre_apellido,
      legajo: emp.legajo || null,
      sector: sector.trim() || null,
      motivo: motivo.trim() || null,
    }));

    const { error } = await supabase.from("faltantes").insert(entriesToSave);

    if (error) {
      if (error.message.includes("contrato")) {
        const withoutContrato = entriesToSave.map(({ contrato: _c, ...rest }) => rest);
        const { error: err2 } = await supabase.from("faltantes").insert(withoutContrato);
        if (err2) {
          toast.error("Error al guardar.");
          setLoading(false);
          return;
        }
      } else {
        toast.error("Error al guardar: " + error.message);
        setLoading(false);
        return;
      }
    }

    toast.success(`✅ ${entriesToSave.length} registros guardados correctamente.`);
    // Reset
    setSearchQuery("");
    setSelectedEmpleados([]);
    setSector("");
    setMotivo("");
    setErrors({});
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registrar Faltante</h1>
          <p className="text-slate-500 text-sm mt-1">Anote personas que faltan en la planilla o sistema.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open("/faltantes/mini", "MiniFaltantes", "width=450,height=800,menubar=no,toolbar=no,location=no,status=no")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-all active:scale-95"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>VENTANA</span>
          </button>
          <button 
            onClick={() => router.back()}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-6" noValidate>
          
          <div className="space-y-4">
            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => updateFecha(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            {/* Búsqueda de Empleado */}
            <div className="space-y-1.5 relative" ref={searchRef}>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Search className="w-3.5 h-3.5" /> Empleado
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="Buscar por nombre o legajo..."
                  className={`w-full bg-slate-50 border rounded-2xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all pr-10 ${errors.nombre ? "border-red-300" : "border-slate-200"}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setSuggestions([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {searchLoading && (
                  <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                )}
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute z-50 left-0 right-0 top-[105%] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-[220px] overflow-y-auto">
                    {suggestions.map((emp) => (
                      <button
                        key={emp.legajo}
                        type="button"
                        onClick={() => selectEmpleado(emp)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between group border-b border-slate-50 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{emp.nombre_apellido}</p>
                          <p className="text-xs text-slate-500 font-medium">Legajo: {emp.legajo}</p>
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded-lg">
                          {emp.contrato}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected List */}
              <AnimatePresence>
                {selectedEmpleados.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100"
                  >
                    {selectedEmpleados.map((emp) => (
                      <motion.div 
                        key={emp.legajo}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 px-3 py-1.5 rounded-xl text-xs font-bold"
                      >
                        {emp.nombre_apellido}
                        <button type="button" onClick={() => removeEmpleado(emp.legajo)} className="hover:text-red-500 p-0.5 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Contrato */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" /> Contrato
              </label>
              <select
                value={contrato}
                onChange={(e) => setContrato(e.target.value)}
                className={`w-full bg-slate-50 border rounded-2xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all ${errors.contrato ? "border-red-300" : "border-slate-200"}`}
              >
                <option value="">Seleccione contrato...</option>
                {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Sector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5" /> Sector
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Ej: Pañol/Logistica"
                list="sectores-faltantes"
                className={`w-full bg-slate-50 border rounded-2xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all border-slate-200`}
              />
              <datalist id="sectores-faltantes">
                {SECTORES_FALTANTES.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Motivo
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Falta cargar"
                list="motivos-faltantes"
                className={`w-full bg-slate-50 border rounded-2xl px-4 py-3.5 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all border-slate-200`}
              />
              <datalist id="motivos-faltantes">
                {MOTIVOS_FALTANTES.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition-all shadow-[0_12px_24px_-8px_rgba(79,70,221,0.4)] disabled:opacity-70 disabled:cursor-not-allowed group active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Guardando {selectedEmpleados.length > 1 ? `(${selectedEmpleados.length})` : ""}...</span>
              </>
            ) : (
              <>
                <span>Guardar {selectedEmpleados.length > 1 ? `(${selectedEmpleados.length}) Registros` : "Registro"}</span>
                <CheckCircle2 className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </button>
        </form>
      </div>
      
      <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/60">
        SJG Montajes Industriales · Sistema de Gestión
      </p>
    </div>
  );
}
