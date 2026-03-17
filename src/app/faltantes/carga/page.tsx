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
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-10 bg-accent-gold rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">Registrar Faltante</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Anote personas que faltan en la planilla o sistema.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.open("/faltantes/mini", "MiniFaltantes", "width=450,height=800,menubar=no,toolbar=no,location=no,status=no")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-accent-gold/20 bg-accent-gold/5 text-accent-gold text-[10px] font-black uppercase tracking-widest hover:bg-accent-gold/10 transition-all active:scale-95 shadow-xl"
          >
            <Maximize2 className="w-4 h-4" />
            <span>VENTANA</span>
          </button>
          <button 
            onClick={() => router.back()}
            className="p-2.5 text-slate-500 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-border"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="bg-card/40 rounded-[2.5rem] border border-border shadow-2xl overflow-hidden backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="p-8 space-y-6" noValidate>
          
          <div className="space-y-4">
            {/* Fecha */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
                <Calendar className="w-3.5 h-3.5 group-hover:text-accent-gold transition-colors" /> Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => updateFecha(e.target.value)}
                className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-xs font-medium text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            {/* Búsqueda de Empleado */}
            <div className="space-y-2 relative" ref={searchRef}>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
                <Search className="w-3.5 h-3.5 group-hover:text-accent-gold transition-colors" /> Empleado
              </label>
              <div className="relative group/input">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="Buscar por nombre o legajo..."
                  className={`w-full bg-background border rounded-2xl px-5 py-4 text-xs font-medium text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all pr-12 shadow-inner ${errors.nombre ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setSuggestions([]); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-accent-gold transition-colors hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {searchLoading && (
                  <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-gold animate-spin" />
                )}
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute z-50 left-0 right-0 top-[110%] bg-card rounded-[2rem] border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                    {suggestions.map((emp) => (
                      <button
                        key={emp.legajo}
                        type="button"
                        onClick={() => selectEmpleado(emp)}
                        className="w-full text-left px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-between group border-b border-border last:border-0"
                      >
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-accent-gold transition-colors uppercase tracking-tight">{emp.nombre_apellido}</p>
                          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Legajo: {emp.legajo}</p>
                        </div>
                        <div className="text-[10px] font-black text-accent-gold/70 uppercase bg-accent-gold/5 px-2.5 py-1.5 rounded-xl border border-accent-gold/10 group-hover:bg-accent-gold group-hover:text-black group-hover:border-transparent transition-all">
                          {emp.contrato}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected List */}
              <AnimatePresence mode="popLayout">
                {selectedEmpleados.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-wrap gap-2.5 mt-4 pt-4 border-t border-border"
                  >
                    {selectedEmpleados.map((emp) => (
                      <motion.div 
                        key={emp.legajo}
                        layout
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        className="inline-flex items-center gap-2.5 bg-accent-gold/10 border border-accent-gold/20 text-accent-gold px-3.5 py-2 rounded-[0.9rem] text-[11px] font-black uppercase tracking-tight shadow-lg"
                      >
                        {emp.nombre_apellido}
                        <button type="button" onClick={() => removeEmpleado(emp.legajo)} className="hover:text-foreground p-0.5 transition-colors">
                          <X className="w-3.5 h-3.5 stroke-[3px]" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Contrato */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
                <Hash className="w-3.5 h-3.5 group-hover:text-accent-gold transition-colors" /> Contrato
              </label>
              <select
                value={contrato}
                onChange={(e) => setContrato(e.target.value)}
                className={`w-full bg-background border rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all appearance-none cursor-pointer ${errors.contrato ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
              >
                <option value="" className="bg-card">Seleccione contrato...</option>
                {CONTRATOS.map(c => <option key={c} value={c} className="bg-card">{c}</option>)}
              </select>
            </div>

            {/* Sector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
                <Building2 className="w-3.5 h-3.5 group-hover:text-accent-gold transition-colors" /> Sector
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                placeholder="Ej: Pañol/Logistica"
                list="sectores-faltantes"
                className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all shadow-inner"
              />
              <datalist id="sectores-faltantes">
                {SECTORES_FALTANTES.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
                <FileText className="w-3.5 h-3.5 group-hover:text-accent-gold transition-colors" /> Motivo
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Falta cargar"
                list="motivos-faltantes"
                className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all shadow-inner"
              />
              <datalist id="motivos-faltantes">
                {MOTIVOS_FALTANTES.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-5 px-6 rounded-2xl bg-gradient-to-r from-accent-gold to-accent-gold-dark hover:from-accent-gold-dark hover:to-accent-gold text-black font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_12px_24px_-8px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98] outline-none focus:ring-4 focus:ring-accent-gold/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Guardando...</span>
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
      
      <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/60">
        SJG Montajes Industriales · Sistema de Gestión
      </p>
    </div>
  );
}
