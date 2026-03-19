"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Save, AlertCircle, CheckCircle2, Loader2, Search, X, Maximize2, Plus, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
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
  hsNormalesMods: HourMods;
  hs50Mods: HourMods;
  hs100Mods: HourMods;
};

const DEFAULT_MODS: HourMods = { insa: false, polu: false, noct: false };

const createEmptyOT = (): OTEntry => ({
  id: Math.random().toString(36).substr(2, 9),
  motivo: "",
  ot: "",
  horasNormales: "",
  horas50: "",
  horas100: "",
  hsNormalesMods: { ...DEFAULT_MODS },
  hs50Mods: { ...DEFAULT_MODS },
  hs100Mods: { ...DEFAULT_MODS },
});

function HourInputRow({ label, val, setVal, mods, setMods }: { label: string, val: string, setVal: (v: string) => void, mods: HourMods, setMods: (m: HourMods) => void }) {
  return (
    <div className="bg-background/20 p-3 rounded-2xl border border-border/50 space-y-2 shadow-inner group transition-all hover:border-accent-gold/20 backdrop-blur-3xl">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
        <input 
          type="number" step="0.5" min="0" 
          value={val} onChange={(e) => setVal(e.target.value)} 
          className="w-16 bg-background border border-border rounded-xl px-2 py-1.5 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none text-[10px] font-black text-foreground text-right appearance-none" 
          placeholder="0" 
        />
      </div>
      <div className="flex items-center justify-around pt-2 border-t border-border/30">
        {(["insa", "polu", "noct"] as const).map(m => (
          <label key={m} className={`flex items-center gap-1.5 text-[8px] font-black cursor-pointer uppercase transition-all tracking-tight ${mods[m] ? 'text-accent-gold' : 'text-slate-600 dark:text-slate-500 hover:text-slate-400'}`}>
            <input 
              type="checkbox" 
              checked={mods[m]} 
              onChange={(e) => setMods({...mods, [m]: e.target.checked})} 
              className="w-3 h-3 rounded border-border bg-background text-accent-gold focus:ring-accent-gold/20 cursor-pointer transition-all"
            />
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
  const [activeOTIndex, setActiveOTIndex] = useState(0);

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

  const addOT = () => {
    setOts([...ots, createEmptyOT()]);
    setActiveOTIndex(ots.length);
  };

  const removeOT = (id: string) => {
    if (ots.length > 1) {
       const index = ots.findIndex(o => o.id === id);
       setOts(ots.filter(o => o.id !== id));
       if (activeOTIndex >= index && activeOTIndex > 0) setActiveOTIndex(activeOTIndex - 1);
    }
  };

  const updateOT = (id: string, updates: Partial<OTEntry>) => setOts(otsMap => otsMap.map(o => o.id === id ? { ...o, ...updates } : o));

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (selectedEmpleados.length === 0 && !searchQuery.trim()) newErrors.empleado = "Requerido";
    if (!contrato) newErrors.contrato = "Requerido";
    if (!sector.trim()) newErrors.sector = "Requerido";
    if (!horarioDesde || !horarioHasta) newErrors.horario = "Requerido";

    ots.forEach((otEntry, idx) => {
      if (!otEntry.motivo) newErrors[`motivo_${idx}`] = "Req";
      if (otEntry.motivo && otEntry.motivo !== "OT Inexistente" && !otEntry.ot.trim()) newErrors[`ot_${idx}`] = "Req";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) {
       toast.error("Complete los campos obligatorios");
       return;
    }
    setLoading(true);
    const fechaISO = `${fecha}T12:00:00.000Z`;
    const [year, month, day] = fecha.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const dias = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
    const horarioStr = `${horarioDesde} a ${horarioHasta}`;

    const employees = selectedEmpleados.length > 0 ? selectedEmpleados : [{ nombre_apellido: searchQuery.trim().toUpperCase(), legajo: legajoManual.trim(), contrato: contrato || "S/C", categoria: null }];

    const records: any[] = [];
    employees.forEach((emp) => {
      ots.forEach((ot, idx) => {
        records.push({
          fecha: fechaISO,
          legajo: emp.legajo,
          nombre_apellido: emp.nombre_apellido,
          motivo_error: ot.motivo,
          ot: ot.ot.trim() || null,
          sector: sector.trim(),
          horario: horarioStr,
          notas: ots.length > 1 ? `[OT ${idx + 1}/${ots.length}] ${notas.trim()}` : (notas.trim() || null),
          contrato: contrato,
          dia_semana: dias[selectedDate.getDay()],
          horas_normales: ot.horasNormales ? parseFloat(ot.horasNormales) : null,
          hs_normales_insa: ot.hsNormalesMods.insa,
          hs_normales_polu: ot.hsNormalesMods.polu,
          hs_normales_noct: ot.hsNormalesMods.noct,
          horas_50: ot.horas50 ? parseFloat(ot.horas50) : null,
          hs_50_insa: ot.hs50Mods.insa,
          hs_50_polu: ot.hs50Mods.polu,
          hs_50_noct: ot.hs50Mods.noct,
          horas_100: ot.horas100 ? parseFloat(ot.horas100) : null,
          hs_100_insa: ot.hs100Mods.insa,
          hs_100_polu: ot.hs100Mods.polu,
          hs_100_noct: ot.hs100Mods.noct,
        });
      });
    });

    const { error } = await supabase.from("error_carga").insert(records);
    if (error) {
      toast.error("Error al guardar.");
      console.error(error);
    } else {
      toast.success("✅ Guardado correctamente.");
      setSelectedEmpleados([]);
      setOts([createEmptyOT()]);
      setActiveOTIndex(0);
      setSearchQuery("");
      setSector("");
      setHorarioDesde("");
      setHorarioHasta("");
      setNotas("");
      setErrors({});
    }
    setLoading(false);
  };

  const activeOT = ots[activeOTIndex];

  return (
    <div className="min-h-screen bg-background p-4 pb-12 font-sans selection:bg-accent-gold/30">
      
      {/* Mini-Header */}
      <div className="flex items-center justify-between mb-4 bg-sidebar/50 backdrop-blur-3xl p-4 rounded-3xl border border-border shadow-2xl sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-accent-gold rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <h1 className="text-xs font-black text-foreground uppercase tracking-tight">Mini Omisiones</h1>
        </div>
        <button onClick={() => window.close()} className="p-2.5 rounded-2xl hover:bg-card border border-transparent hover:border-border transition-all text-slate-500 hover:text-foreground active:scale-95">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-card/40 rounded-[2rem] border border-border shadow-2xl backdrop-blur-3xl overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full" noValidate>
          
          <div className="p-6 space-y-6">
            {/* Empleado Section (Compact) */}
            <div ref={searchRef} className="space-y-2 relative">
              <div className="relative group/input">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  className={`w-full bg-background border rounded-2xl pl-10 pr-10 py-3.5 text-xs font-black uppercase tracking-widest text-foreground placeholder:text-slate-500 outline-none transition-all shadow-inner ${errors.empleado ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                  placeholder="Nombre o legajo..."
                  autoComplete="off"
                />
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  {searchLoading ? <Loader2 className="w-4 h-4 text-accent-gold animate-spin" /> : <Search className="w-4 h-4 text-slate-500" />}
                </div>
              </div>

              {selectedEmpleados.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedEmpleados.map((emp) => (
                    <div key={emp.legajo} className="flex items-center gap-2 bg-accent-gold/10 border border-accent-gold/20 text-accent-gold px-2 py-1 rounded-xl text-[8px] font-black uppercase tracking-tight">
                      {emp.nombre_apellido.split(' ')[0]}
                      <button type="button" onClick={() => removeEmpleado(emp.legajo)}><X className="w-3 h-3 hover:text-foreground" /></button>
                    </div>
                  ))}
                </div>
              )}

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-[100] left-0 right-0 top-[110%] bg-card border border-border rounded-2xl shadow-3xl overflow-hidden overflow-y-auto max-h-48 backdrop-blur-3xl animate-in fade-in slide-in-from-top-2">
                  {suggestions.map((emp) => (
                    <button key={emp.legajo} type="button" onClick={() => selectEmpleado(emp)} className="w-full text-left px-4 py-3 hover:bg-accent-gold/5 transition-colors border-b border-border last:border-0 group/item">
                       <p className="text-[10px] font-bold text-foreground uppercase tracking-tight group-hover/item:text-accent-gold transition-colors">{emp.nombre_apellido}</p>
                       <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{emp.legajo} · {emp.contrato}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Config Grid (Compact) */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 block mb-1.5 ml-1 tracking-widest">Fecha</label>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full bg-background border border-border rounded-2xl px-3 py-3 text-[10px] font-black uppercase tracking-widest text-foreground [color-scheme:light] dark:[color-scheme:dark] shadow-inner" />
               </div>
               <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 block mb-1.5 ml-1 tracking-widest">Contrato</label>
                  <select value={contrato} onChange={(e) => setContrato(e.target.value)} className="w-full bg-background border border-border rounded-2xl px-3 py-3 text-[10px] font-black uppercase tracking-widest text-foreground appearance-none shadow-inner">
                    <option value="">Contrato...</option>
                    {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
               </div>
            </div>

            {/* TABBED OT SECTION (Compact for Mini) */}
            <div className="space-y-4">
               <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pr-2">
                    {ots.map((o, idx) => (
                      <button key={o.id} type="button" onClick={() => setActiveOTIndex(idx)} 
                        className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all flex-shrink-0 ${activeOTIndex === idx ? 'bg-accent-gold text-black shadow-lg shadow-accent-gold/20' : 'bg-background border border-border text-slate-500 hover:border-accent-gold/50'}`}>
                        OT {idx + 1}
                      </button>
                    ))}
                    <button type="button" onClick={addOT} className="p-1.5 rounded-xl bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 flex-shrink-0 border border-dashed border-accent-gold/30">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  {ots.length > 1 && <button type="button" onClick={() => removeOT(activeOT.id)} className="p-2 text-slate-400 hover:text-red-500 active:scale-95"><Trash2 className="w-3.5 h-3.5" /></button>}
               </div>

               <AnimatePresence mode="wait">
                 <motion.div key={activeOT.id} initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="col-span-1">
                          <label className="text-[9px] font-black uppercase text-accent-gold block mb-1.5 ml-1 tracking-widest">Motivo OT {activeOTIndex + 1}</label>
                          <select value={activeOT.motivo} onChange={(e) => updateOT(activeOT.id, { motivo: e.target.value })} className="w-full bg-background border border-border rounded-xl px-2 py-2.5 text-[9px] font-black uppercase tracking-widest text-foreground appearance-none shadow-inner">
                            <option value="">Motivo...</option>
                            {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                       </div>
                       <div className="col-span-1">
                          <label className="text-[9px] font-black uppercase text-accent-gold block mb-1.5 ml-1 tracking-widest">Nro de OT</label>
                          <input type="text" value={activeOT.ot} onChange={(e) => updateOT(activeOT.id, { ot: e.target.value.replace(/\D/g, "").slice(0, 12) })} disabled={activeOT.motivo === "OT Inexistente"} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-[11px] font-black text-foreground placeholder:text-slate-600 outline-none disabled:opacity-30 disabled:grayscale shadow-inner" placeholder="00123..." maxLength={12} />
                       </div>
                    </div>
                    
                    {/* Compact Hours Row */}
                    <div className="grid grid-cols-1 gap-3">
                       <HourInputRow label="Normales" val={activeOT.horasNormales} setVal={(v) => updateOT(activeOT.id, { horasNormales: v })} mods={activeOT.hsNormalesMods} setMods={(v) => updateOT(activeOT.id, { hsNormalesMods: v })} />
                       <div className="grid grid-cols-2 gap-3">
                          <HourInputRow label="H 50%" val={activeOT.horas50} setVal={(v) => updateOT(activeOT.id, { horas50: v })} mods={activeOT.hs50Mods} setMods={(v) => updateOT(activeOT.id, { hs50Mods: v })} />
                          <HourInputRow label="H 100%" val={activeOT.horas100} setVal={(v) => updateOT(activeOT.id, { horas100: v })} mods={activeOT.hs100Mods} setMods={(v) => updateOT(activeOT.id, { hs100Mods: v })} />
                       </div>
                    </div>
                 </motion.div>
               </AnimatePresence>
            </div>

            {/* Bottom Config */}
            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border">
               <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1.5 ml-1 tracking-widest">Sector</label>
                    <input type="text" value={sector} onChange={(e) => setSector(e.target.value.toUpperCase())} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground outline-none shadow-inner" placeholder="Puesto Fijo..." />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-500 block mb-1.5 ml-1 tracking-widest">Horario</label>
                    <div className="flex items-center gap-1.5">
                       <input type="time" value={horarioDesde} onChange={(e) => setHorarioDesde(e.target.value)} className="w-[45%] bg-background border border-border rounded-xl px-1.5 py-1.5 text-[10px] font-black shadow-inner" />
                       <span className="text-slate-400">-</span>
                       <input type="time" value={horarioHasta} onChange={(e) => setHorarioHasta(e.target.value)} className="w-[45%] bg-background border border-border rounded-xl px-1.5 py-1.5 text-[10px] font-black shadow-inner" />
                    </div>
                  </div>
               </div>
               <div>
                  <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-[10px] font-medium text-foreground outline-none shadow-inner resize-none placeholder:text-slate-600" placeholder="Observaciones adicionales..." />
               </div>
            </div>
          </div>

          <div className="p-6 pt-0">
             <button type="submit" disabled={loading} className="w-full h-14 rounded-2xl bg-gradient-to-r from-accent-gold to-accent-gold-dark text-black font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all hover:shadow-[0_8px_30px_rgba(217,119,6,0.3)] active:scale-95 disabled:opacity-50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12" />
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 opacity-70" />}
                <span>{loading ? "Procesando..." : "Guardar Registro"}</span>
             </button>
             <p className="text-center text-[8px] text-slate-600 dark:text-slate-500 mt-4 font-black uppercase tracking-[0.4em] opacity-60">SJG v2.1 (Multi-OT)</p>
          </div>
        </form>
      </div>
    </div>
  );
}
