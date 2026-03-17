"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar, Building2, FileText, Hash, Search, X, CheckCircle2, ChevronRight, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import { CONTRATOS, SECTORES_FALTANTES, MOTIVOS_FALTANTES } from "@/types";

type Empleado = {
  nombre_apellido: string;
  legajo: string;
  contrato: string;
};

export default function MiniCargaFaltante() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Empleado[]>([]);
  const [selectedEmpleados, setSelectedEmpleados] = useState<Empleado[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [contrato, setContrato] = useState("");
  const [sector, setSector] = useState("");
  const [motivo, setMotivo] = useState("");

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
        .limit(6);
      setSuggestions(data || []);
      setShowSuggestions(true);
      setSearchLoading(false);
    }, 300);
  };

  const selectEmpleado = (emp: Empleado) => {
    if (selectedEmpleados.some(e => e.legajo === emp.legajo)) {
      toast.error("Ya está en la lista");
      return;
    }
    setSelectedEmpleados([...selectedEmpleados, emp]);
    setSearchQuery("");
    if (!contrato) setContrato(emp.contrato);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contrato || (selectedEmpleados.length === 0 && !searchQuery.trim())) {
      toast.error("Complete los campos obligatorios");
      return;
    }
    if (!sector.trim() && !motivo.trim()) {
      toast.error("Sector o Motivo requerido");
      return;
    }

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
       toast.error("Error al guardar");
    } else {
      toast.success("¡Guardado correctamente!");
      setSelectedEmpleados([]);
      setSearchQuery("");
      setSector("");
      setMotivo("");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-200 font-sans p-4">
      <Toaster position="top-center" richColors />
      
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-base font-black text-white tracking-tight uppercase">Mini Faltantes</h1>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.15em] mt-0.5">SJG Gestión</p>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-white/5 border border-white/5 shadow-inner">
          <UserPlus className="w-4 h-4 text-amber-500/70" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fecha */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            <Calendar className="w-3 h-3 group-hover:text-amber-500 transition-colors" /> Fecha
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => {
              setFecha(e.target.value);
              sessionStorage.setItem("sjg_working_date", e.target.value);
            }}
            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-medium text-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all [color-scheme:dark]"
          />
        </div>

        {/* Empleado */}
        <div className="space-y-1.5 relative" ref={searchRef}>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            <Search className="w-3 h-3 group-hover:text-amber-500 transition-colors" /> Empleado
          </label>
          <div className="relative group/input">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-medium text-slate-300 placeholder:text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all pr-12 shadow-inner"
            />
            {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-amber-500" />}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-[110%] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl">
              {suggestions.map((emp) => (
                <button
                  key={emp.legajo}
                  type="button"
                  onClick={() => selectEmpleado(emp)}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                >
                  <p className="text-[11px] font-bold text-slate-200 uppercase tracking-tight">{emp.nombre_apellido}</p>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Leg: {emp.legajo} · {emp.contrato}</p>
                </button>
              ))}
            </div>
          )}

          {/* List of selected */}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {selectedEmpleados.map(emp => (
              <div key={emp.legajo} className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/10 text-amber-500 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-lg animate-in fade-in zoom-in duration-200">
                {emp.nombre_apellido.split(' ')[0]}
                <button type="button" onClick={() => setSelectedEmpleados(prev => prev.filter(e => e.legajo !== emp.legajo))}>
                  <X className="w-3 h-3 hover:text-white stroke-[3px]" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Contrato */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            <Hash className="w-3 h-3 group-hover:text-amber-500 transition-colors" /> Contrato
          </label>
          <select
            value={contrato}
            onChange={(e) => setContrato(e.target.value)}
            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-medium text-slate-300 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all appearance-none cursor-pointer"
          >
            <option value="" className="bg-slate-900">Seleccione...</option>
            {CONTRATOS.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
          </select>
        </div>

        {/* Sector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            <Building2 className="w-3 h-3 group-hover:text-amber-500 transition-colors" /> Sector
          </label>
          <input
            type="text"
            list="mini-sectores"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Ej: Planta A"
            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-medium text-slate-300 placeholder:text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all shadow-inner"
          />
          <datalist id="mini-sectores">
            {SECTORES_FALTANTES.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>

        {/* Motivo */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
            <FileText className="w-3 h-3 group-hover:text-amber-500 transition-colors" /> Motivo
          </label>
          <input
            type="text"
            list="mini-motivos"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Falta planilla"
            className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xs font-medium text-slate-300 placeholder:text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none transition-all shadow-inner"
          />
          <datalist id="mini-motivos">
            {MOTIVOS_FALTANTES.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black py-4 rounded-2xl shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-3 mt-6 disabled:opacity-50 text-[11px] uppercase tracking-[0.2em] outline-none focus:ring-4 focus:ring-amber-500/30"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 opacity-70" />}
          {loading ? "Guardando..." : `Guardar ${selectedEmpleados.length > 1 ? `(${selectedEmpleados.length})` : "Registro"}`}
        </button>
      </form>

      <div className="mt-8 pt-4 border-t border-white/5 flex flex-col items-center gap-2 opacity-30">
        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">SJG Montajes Industriales</p>
      </div>
    </div>
  );
}
