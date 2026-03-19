"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Save, AlertCircle, CheckCircle2, Loader2, Search, X, Maximize2, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { ErrorCarga, MOTIVOS, CONTRATOS } from "@/types";

type Empleado = {
  nombre_apellido: string;
  legajo: string;
  contrato: string;
  categoria: string | null;
};

type FormErrors = Partial<Record<string, string>>;
type HourMods = { insa: boolean; polu: boolean; noct: boolean };

type OTEntry = {
  id: string;
  motivo: string;
  ot: string;
  horasNormales: string;
  horas50: string;
  horas100: string;
};

const createEmptyOT = (): OTEntry => ({
  id: Math.random().toString(36).substr(2, 9),
  motivo: "",
  ot: "",
  horasNormales: "",
  horas50: "",
  horas100: "",
});

function HourInputRow({ label, val, setVal, mods, setMods }: { label: string, val: string, setVal: (v: string) => void, mods: HourMods, setMods: (m: HourMods) => void }) {
  return (
    <div className="bg-background/40 p-3 rounded-2xl border border-border space-y-2 shadow-inner group transition-all hover:border-accent-gold/20">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
        <input 
          type="number" step="0.5" min="0" 
          value={val} onChange={(e) => setVal(e.target.value)} 
          className="w-20 bg-background border border-border rounded-xl px-3 py-1.5 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none text-xs font-bold text-foreground text-right appearance-none" 
          placeholder="0" 
        />
      </div>
      <div className="flex items-center justify-around pt-2 border-t border-border">
        {(["insa", "polu", "noct"] as const).map(m => (
          <label key={m} className={`flex items-center gap-1.5 text-[9px] font-black cursor-pointer uppercase transition-all tracking-tighter ${mods[m] ? 'text-accent-gold' : 'text-slate-600 dark:text-slate-500 hover:text-slate-400'}`}>
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                checked={mods[m]} 
                onChange={(e) => setMods({...mods, [m]: e.target.checked})} 
                className="w-3.5 h-3.5 rounded-lg border-border bg-background text-accent-gold focus:ring-accent-gold/20 cursor-pointer transition-all"
              />
            </div>
            {m === 'insa' ? 'INS' : m === 'polu' ? 'POL' : 'NOC'}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function MiniCargaPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const [loading, setLoading] = useState(false);
  
  // Autocomplete
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Empleado[]>([]);
  const [selectedEmpleados, setSelectedEmpleados] = useState<Empleado[]>([]);
  const [contrato, setContrato] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [fecha, setFecha] = useState("");
  const [sector, setSector] = useState("");
  const [horarioDesde, setHorarioDesde] = useState("");
  const [horarioHasta, setHorarioHasta] = useState("");
  const [notas, setNotas] = useState("");
  const [legajoManual, setLegajoManual] = useState("");

  // OTs state
  const [ots, setOts] = useState<OTEntry[]>([createEmptyOT()]);

  // Shared mods
  const [hsNormalesMods, setHsNormalesMods] = useState<HourMods>({ insa: false, polu: false, noct: false });
  const [hs50Mods, setHs50Mods] = useState<HourMods>({ insa: false, polu: false, noct: false });
  const [hs100Mods, setHs100Mods] = useState<HourMods>({ insa: false, polu: false, noct: false });

  // Validation errors
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const saved = sessionStorage.getItem("sjg_working_date");
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000)).toISOString().split("T")[0];
    setFecha(saved || localToday);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (errors.empleado) setErrors((e) => ({ ...e, empleado: "" }));

    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim() || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("empleados")
          .select("*")
          .or(`nombre_apellido.ilike.%${value}%,legajo.ilike.%${value}%`)
          .limit(10);
        
        if (error) throw error;
        setSuggestions(data || []);
      } catch (err) {
        console.error("Search error:", err);
        setSuggestions([]);
      } finally {
        setShowSuggestions(true);
        setSearchLoading(false);
      }
    }, 400);
  };

  const selectEmpleado = (emp: Empleado) => {
    if (selectedEmpleados.some(e => e.legajo === emp.legajo)) {
      toast.error("Ya está en la lista.");
      return;
    }
    setSelectedEmpleados(prev => [...prev, emp]);
    if (!contrato && emp.contrato) setContrato(emp.contrato);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setErrors((e) => ({ ...e, empleado: "" }));
  };

  const addManualEmpleado = () => {
    if (!searchQuery.trim() || !legajoManual.trim()) {
      toast.error("Complete nombre y legajo");
      return;
    }
    const virtualEmp: Empleado = {
      nombre_apellido: searchQuery.trim().toUpperCase(),
      legajo: legajoManual.trim(),
      contrato: contrato || "S/C",
      categoria: "MANUAL"
    };
    setSelectedEmpleados([...selectedEmpleados, virtualEmp]);
    setSearchQuery("");
    setLegajoManual("");
    setShowSuggestions(false);
  };

  const removeEmpleado = (legajo: string) => {
    setSelectedEmpleados(prev => prev.filter(e => e.legajo !== legajo));
  };

  const addOT = () => setOts([...ots, createEmptyOT()]);
  const removeOT = (id: string) => ots.length > 1 && setOts(ots.filter(o => o.id !== id));
  const updateOT = (id: string, updates: Partial<OTEntry>) => setOts(ots.map(o => o.id === id ? { ...o, ...updates } : o));

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const hasNames = selectedEmpleados.length > 0 || searchQuery.trim();
    const hasLegajos = selectedEmpleados.length > 0 || legajoManual.trim();

    if (!hasNames) newErrors.empleado = "Requerido";
    if (!hasLegajos) newErrors.legajo = "Requerido";
    if (!contrato) newErrors.contrato = "Requerido";
    if (!sector.trim()) newErrors.sector = "Requerido";

    ots.forEach((otEntry, idx) => {
      if (!otEntry.motivo) newErrors[`motivo_${idx}`] = "Requerido";
      if (otEntry.motivo && otEntry.motivo !== "OT Inexistente") {
        if (!otEntry.ot.trim()) {
          newErrors[`ot_${idx}`] = "Requerido";
        } else if (!/^\d{8,12}$/.test(otEntry.ot.trim())) {
          newErrors[`ot_${idx}`] = "8-12 dígitos";
        }
      }
    });

    if (!horarioDesde) newErrors.horarioDesde = "Requerido";
    if (!horarioHasta) newErrors.horarioHasta = "Requerido";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const [year, month, day] = fecha.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const fechaISO = `${fecha}T12:00:00.000Z`;
    const dias = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
    const horarioStr = horarioDesde && horarioHasta ? `${horarioDesde} a ${horarioHasta}` : null;

    const employeesToSave = [...selectedEmpleados];
    if (employeesToSave.length === 0 && searchQuery.trim() && legajoManual.trim()) {
      employeesToSave.push({
        nombre_apellido: searchQuery.trim(),
        legajo: legajoManual.trim(),
        contrato: contrato || "S/C",
        categoria: null
      });
    }

    if (employeesToSave.length === 0) {
      toast.error("Agregue al menos un empleado");
      setLoading(false);
      return;
    }

    const recordsToInsert: any[] = [];

    employeesToSave.forEach((emp) => {
      ots.forEach((otEntry, idx) => {
        recordsToInsert.push({
          fecha: fechaISO,
          legajo: emp.legajo,
          nombre_apellido: emp.nombre_apellido,
          motivo_error: otEntry.motivo,
          ot: otEntry.ot.trim() || null,
          sector: sector.trim(),
          horario: horarioStr,
          notas: ots.length > 1 ? `[OT ${idx + 1}/${ots.length}] ${notas.trim()}` : (notas.trim() || null),
          contrato: contrato,
          dia_semana: dias[selectedDate.getDay()],
          horas_normales: otEntry.horasNormales ? parseFloat(otEntry.horasNormales) : null,
          hs_normales_insa: hsNormalesMods.insa,
          hs_normales_polu: hsNormalesMods.polu,
          hs_normales_noct: hsNormalesMods.noct,
          horas_50: otEntry.horas50 ? parseFloat(otEntry.horas50) : null,
          hs_50_insa: hs50Mods.insa,
          hs_50_polu: hs50Mods.polu,
          hs_50_noct: hs50Mods.noct,
          horas_100: otEntry.horas100 ? parseFloat(otEntry.horas100) : null,
          hs_100_insa: hs100Mods.insa,
          hs_100_polu: hs100Mods.polu,
          hs_100_noct: hs100Mods.noct,
        });
      });
    });

    const { error } = await supabase.from("error_carga").insert(recordsToInsert);

    if (error) {
      if (error.message.includes("contrato")) {
        const withoutContrato = recordsToInsert.map(({ contrato: _c, ...rest }) => rest);
        const { error: err2 } = await supabase.from("error_carga").insert(withoutContrato);
        if (err2) {
          toast.error("Error al guardar.");
          setLoading(false);
          return;
        }
      } else {
        toast.error("Error al guardar.");
        setLoading(false);
        return;
      }
    }

    toast.success(`✅ ${recordsToInsert.length} registros guardados.`);
    setLoading(false);
    
    // Reset but keep date
    setSelectedEmpleados([]);
    setSearchQuery("");
    setContrato("");
    setSector("");
    setHorarioDesde("");
    setHorarioHasta("");
    setNotas("");
    setLegajoManual("");
    setOts([createEmptyOT()]);
    setHsNormalesMods({ insa: false, polu: false, noct: false });
    setHs50Mods({ insa: false, polu: false, noct: false });
    setHs100Mods({ insa: false, polu: false, noct: false });
    setErrors({});
  };

  return (
    <>
    {(status === "loading") && (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent-gold" />
      </div>
    )}
    {status !== "loading" && !isAdmin && (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest text-center">
          Acceso no autorizado
        </p>
      </div>
    )}
    {status !== "loading" && isAdmin && (
    <div className="min-h-screen bg-background p-4 pb-12 font-sans selection:bg-accent-gold/30">
      <div className="flex items-center justify-between mb-4 bg-sidebar/80 backdrop-blur-xl p-4 rounded-[2rem] border border-border shadow-2xl sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-accent-gold rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-xs font-black text-foreground tracking-tight uppercase">Mini Omisiones</h1>
            <p className="text-[9px] text-slate-600 dark:text-slate-500 font-black uppercase tracking-[0.15em] mt-0.5">SJG Gestión Multi-OT</p>
          </div>
        </div>
        <button 
          onClick={() => window.close()}
          className="p-2 rounded-xl bg-background/50 border border-border hover:bg-card transition-all text-slate-500 hover:text-foreground"
          title="Cerrar ventana"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-card/40 rounded-[2.5rem] border border-border shadow-2xl backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          
          {/* Empleado */}
          <div ref={searchRef} className="space-y-1.5 relative">
            <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 font-black uppercase tracking-widest">
              <Search className="w-3 h-3 group-hover:text-accent-gold transition-colors" /> Empleado*
            </label>
            <div className="relative group/input">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className={`w-full bg-background border rounded-2xl pl-10 pr-10 py-3 text-xs font-black uppercase tracking-widest text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 outline-none transition-all shadow-inner ${errors.empleado ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                placeholder="Nombre o legajo..."
                autoComplete="off"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                {searchLoading ? (
                  <Loader2 className="w-4 h-4 text-accent-gold animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-700 group-focus-within/input:text-accent-gold transition-colors" />
                )}
              </div>
            </div>
            {errors.empleado && <p className="text-red-500 text-[9px] ml-1 font-black uppercase tracking-widest leading-none mt-1">{errors.empleado}</p>}

            {/* Selected List */}
            {selectedEmpleados.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 animate-in fade-in zoom-in duration-300">
                {selectedEmpleados.map((emp) => (
                  <div key={emp.legajo} className="flex items-center gap-2 bg-accent-gold/10 border border-accent-gold/20 text-accent-gold px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight shadow-lg">
                    {emp.nombre_apellido.split(' ')[0]}
                    <button type="button" onClick={() => removeEmpleado(emp.legajo)}>
                      <X className="w-3 h-3 hover:text-foreground transition-colors stroke-[3px]" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-[110%] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl max-h-60 overflow-y-auto custom-scrollbar">
                {suggestions.map((emp) => (
                  <button key={emp.legajo} type="button" onClick={() => selectEmpleado(emp)}
                    className="w-full text-left px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-border last:border-0 group/item">
                    <p className="text-[11px] font-bold text-foreground uppercase tracking-tight group-hover/item:text-accent-gold transition-colors">{emp.nombre_apellido}</p>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Leg: {emp.legajo} · {emp.contrato}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 font-black uppercase tracking-widest">Fecha*</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-background border border-border rounded-2xl px-3 py-3 text-xs font-black uppercase tracking-widest text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 font-black uppercase tracking-widest">Contrato*</label>
              <select value={contrato} onChange={(e) => setContrato(e.target.value)}
                className={`w-full bg-background border rounded-2xl px-3 py-3 text-xs font-black uppercase tracking-widest text-foreground outline-none transition-all appearance-none cursor-pointer ${errors.contrato ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
              >
                <option value="" className="bg-card text-slate-500">Contrato...</option>
                {CONTRATOS.map(c => <option key={c} value={c} className="bg-card text-foreground">{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
             <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 font-black uppercase tracking-widest">Sector*</label>
              <input type="text" value={sector} onChange={(e) => setSector(e.target.value)}
                className={`w-full bg-background border rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 outline-none transition-all shadow-inner ${errors.sector ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                placeholder="Ej: Planta A" />
            </div>
          </div>

          {/* OTs Array */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 font-black uppercase tracking-widest">Ordenes de Trabajo</p>
              <button type="button" onClick={addOT} className="flex items-center gap-1 px-2 py-1 rounded-xl bg-accent-gold/10 text-accent-gold text-[9px] font-black uppercase tracking-widest border border-accent-gold/20 active:scale-95">
                <Plus className="w-3 h-3" /> Agregar OT
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {ots.map((o, idx) => (
                <motion.div 
                  key={o.id} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: 10 }}
                  className={`p-4 rounded-3xl border ${idx % 2 === 0 ? 'bg-slate-500/5 border-slate-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">OT {idx + 1}</span>
                    {ots.length > 1 && <button type="button" onClick={() => removeOT(o.id)} className="text-red-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                       <select value={o.motivo} onChange={(e) => updateOT(o.id, { motivo: e.target.value })}
                        className={`w-full bg-background border rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground outline-none ${errors[`motivo_${idx}`] ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                      >
                        <option value="">Motivo...</option>
                        {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                       <input type="text" value={o.ot} onChange={(e) => updateOT(o.id, { ot: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                        disabled={o.motivo === "OT Inexistente"}
                        className={`w-full bg-background border rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-foreground outline-none disabled:opacity-20 ${errors[`ot_${idx}`] ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                        placeholder="Número OT (8-12 dígitos)" maxLength={12} />
                    </div>

                    <div className="grid grid-cols-1 gap-2 space-y-2">
                      <HourInputRow label="Normales" val={o.horasNormales} setVal={(v) => updateOT(o.id, { horasNormales: v })} mods={hsNormalesMods} setMods={setHsNormalesMods} />
                      <div className="grid grid-cols-2 gap-2">
                         <HourInputRow label="Al 50%" val={o.horas50} setVal={(v) => updateOT(o.id, { horas50: v })} mods={hs50Mods} setMods={setHs50Mods} />
                         <HourInputRow label="Al 100%" val={o.horas100} setVal={(v) => updateOT(o.id, { horas100: v })} mods={hs100Mods} setMods={setHs100Mods} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5 font-black uppercase tracking-widest">Horario*</label>
            <div className="flex items-center gap-3">
              <input type="time" value={horarioDesde} onChange={(e) => setHorarioDesde(e.target.value)}
                className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground outline-none focus:ring-4 focus:ring-accent-gold/10 transition-all [color-scheme:light] dark:[color-scheme:dark]" />
              <div className="w-4 h-[1px] bg-border" />
              <input type="time" value={horarioHasta} onChange={(e) => setHorarioHasta(e.target.value)}
                className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground outline-none focus:ring-4 focus:ring-accent-gold/10 transition-all [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
          </div>

          <div className="pt-2">
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
              className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground outline-none focus:ring-4 focus:ring-accent-gold/10 transition-all resize-none shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700"
              placeholder="Notas u observaciones adicionales..." />
          </div>

          <button type="submit" disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-accent-gold to-accent-gold-dark text-black font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all hover:from-accent-gold-dark hover:to-accent-gold active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 opacity-70" />}
            <span>{loading ? "Guardando..." : `Guardar ${selectedEmpleados.length > 1 ? `(${selectedEmpleados.length})` : "Registro"}`}</span>
          </button>
        </form>
      </div>
      
      <p className="text-center text-[9px] text-slate-600 dark:text-slate-500 mt-6 font-black uppercase tracking-[0.3em] opacity-80 font-black uppercase tracking-widest">
        SJG Management Hub · v2.1 (Multi-OT)
      </p>
    </div>
    )}
    </>
  );
}
