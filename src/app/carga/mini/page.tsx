"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Save, AlertCircle, CheckCircle2, Loader2, Search, X, Maximize2 } from "lucide-react";
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
  const [motivo, setMotivo] = useState("");
  const [ot, setOt] = useState("");
  const [sector, setSector] = useState("");
  const [horarioDesde, setHorarioDesde] = useState("");
  const [horarioHasta, setHorarioHasta] = useState("");
  const [notas, setNotas] = useState("");
  const [legajoManual, setLegajoManual] = useState("");

  // Hours details
  const [horasNormales, setHorasNormales] = useState("");
  const [hsNormalesMods, setHsNormalesMods] = useState<HourMods>({ insa: false, polu: false, noct: false });
  const [horas50, setHoras50] = useState("");
  const [hs50Mods, setHs50Mods] = useState<HourMods>({ insa: false, polu: false, noct: false });
  const [horas100, setHoras100] = useState("");
  const [hs100Mods, setHs100Mods] = useState<HourMods>({ insa: false, polu: false, noct: false });

  // Split OT feature
  const [splitOT, setSplitOT] = useState(false);
  const [motivo2, setMotivo2] = useState("");
  const [ot2, setOt2] = useState("");
  const [horasNormales2, setHorasNormales2] = useState("");
  const [horas502, setHoras502] = useState("");
  const [horas1002, setHoras1002] = useState("");

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

  const clearEmpleado = () => {
    setSelectedEmpleados([]);
    setSearchQuery("");
    setContrato("");
    setLegajoManual("");
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const hasNames = selectedEmpleados.length > 0 || searchQuery.trim();
    const hasLegajos = selectedEmpleados.length > 0 || legajoManual.trim();

    if (!hasNames) newErrors.empleado = "Requerido";
    if (!hasLegajos) newErrors.legajo = "Requerido";
    if (!contrato) newErrors.contrato = "Requerido";
    if (!motivo) newErrors.motivo = "Requerido";
    if (!sector.trim()) newErrors.sector = "Requerido";

    if (motivo && motivo !== "OT Inexistente") {
      if (!ot.trim()) {
        newErrors.ot = "Requerido";
      } else if (!/^\d{8,12}$/.test(ot.trim())) {
        newErrors.ot = "8-12 dígitos";
      }
    } else if (ot.trim() && !/^\d{8,12}$/.test(ot.trim())) {
      newErrors.ot = "8-12 dígitos";
    }

    if (!horarioDesde) newErrors.horarioDesde = "Requerido";
    if (!horarioHasta) newErrors.horarioHasta = "Requerido";

    setErrors(newErrors);
    return Object.keys(newErrors).filter((k) => newErrors[k]).length === 0;
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

    const employeesToSave = selectedEmpleados;

    if (employeesToSave.length === 0) {
      if (searchQuery.trim() && legajoManual.trim()) {
        employeesToSave.push({
          nombre_apellido: searchQuery.trim(),
          legajo: legajoManual.trim(),
          contrato: contrato || "S/C",
          categoria: null
        });
      } else {
        toast.error("Agregue al menos un empleado");
        setLoading(false);
        return;
      }
    }

    const recordsToInsert: any[] = [];

    employeesToSave.forEach((emp) => {
      // Record 1
      recordsToInsert.push({
        fecha: fechaISO,
        legajo: emp.legajo,
        nombre_apellido: emp.nombre_apellido,
        motivo_error: motivo,
        ot: ot.trim() || null,
        sector: sector.trim(),
        horario: horarioStr,
        notas: splitOT ? `[1/2] ${notas.trim()}` : (notas.trim() || null),
        contrato: contrato,
        dia_semana: dias[selectedDate.getDay()],
        horas_normales: horasNormales ? parseFloat(horasNormales) : null,
        hs_normales_insa: hsNormalesMods.insa,
        hs_normales_polu: hsNormalesMods.polu,
        hs_normales_noct: hsNormalesMods.noct,
        horas_50: horas50 ? parseFloat(horas50) : null,
        hs_50_insa: hs50Mods.insa,
        hs_50_polu: hs50Mods.polu,
        hs_50_noct: hs50Mods.noct,
        horas_100: horas100 ? parseFloat(horas100) : null,
        hs_100_insa: hs100Mods.insa,
        hs_100_polu: hs100Mods.polu,
        hs_100_noct: hs100Mods.noct,
      });

      // Flexible Record 2
      if (splitOT) {
        recordsToInsert.push({
          fecha: fechaISO,
          legajo: emp.legajo,
          nombre_apellido: emp.nombre_apellido,
          motivo_error: motivo2,
          ot: ot2.trim() || null,
          sector: sector.trim(),
          horario: horarioStr,
          notas: `[2/2] ${notas.trim()}`,
          contrato: contrato,
          dia_semana: dias[selectedDate.getDay()],
          horas_normales: horasNormales2 ? parseFloat(horasNormales2) : null,
          hs_normales_insa: hsNormalesMods.insa,
          hs_normales_polu: hsNormalesMods.polu,
          hs_normales_noct: hsNormalesMods.noct,
          horas_50: horas502 ? parseFloat(horas502) : null,
          hs_50_insa: hs50Mods.insa,
          hs_50_polu: hs50Mods.polu,
          hs_50_noct: hs50Mods.noct,
          horas_100: horas1002 ? parseFloat(horas1002) : null,
          hs_100_insa: hs100Mods.insa,
          hs_100_polu: hs100Mods.polu,
          hs_100_noct: hs100Mods.noct,
        });
      }
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

    toast.success(`✅ ${recordsToInsert.length} ${recordsToInsert.length > 1 ? 'registros guardados' : 'registro guardado'}.`);
    setLoading(false);
    
    // Reset fields but keep state relevant for multiple loads
    setSelectedEmpleados([]);
    setSearchQuery("");
    setContrato("");
    setMotivo("");
    setOt("");
    setSector("");
    setHorarioDesde("");
    setHorarioHasta("");
    setNotas("");
    setLegajoManual("");
    setSplitOT(false);
    setOt2("");
    setMotivo2("");
    setHorasNormales2("");
    setHorasNormales("");
    setHsNormalesMods({ insa: false, polu: false, noct: false });
    setHoras50("");
    setHs50Mods({ insa: false, polu: false, noct: false });
    setHoras100("");
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
            <p className="text-[9px] text-slate-600 dark:text-slate-500 font-black uppercase tracking-[0.15em] mt-0.5">SJG Gestión</p>
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
            <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Search className="w-3 h-3 group-hover:text-accent-gold transition-colors" /> Empleado*
            </label>
            <div className="relative group/input">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className={`w-full bg-background border rounded-2xl pl-10 pr-10 py-3 text-xs font-medium text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all shadow-inner ${errors.empleado ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
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
              {searchQuery && !searchLoading && (
                <button type="button" onClick={() => { setSearchQuery(""); setSelectedEmpleados([]); setSuggestions([]); setShowSuggestions(false); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
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

            {showSuggestions && suggestions.length === 0 && searchQuery.length >= 2 && !searchLoading && (
              <div className="p-4 bg-accent-gold/5 rounded-2xl border border-dashed border-accent-gold/20 space-y-3 animate-in fade-in zoom-in duration-300">
                <p className="text-[9px] text-accent-gold/80 font-black uppercase tracking-widest leading-none">Empleado no encontrado. Ingrese legajo manual:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={legajoManual}
                    onChange={(e) => setLegajoManual(e.target.value)}
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-[11px] font-bold text-foreground outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all font-black"
                    placeholder="Legajo SAP..."
                  />
                  <button 
                    type="button" 
                    onClick={addManualEmpleado}
                    className="px-3 rounded-xl bg-accent-gold text-black font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">Fecha*</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-background border border-border rounded-2xl px-3 py-3 text-xs font-medium text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">Contrato*</label>
              <select value={contrato} onChange={(e) => setContrato(e.target.value)}
                className={`w-full bg-background border rounded-2xl px-3 py-3 text-xs font-black uppercase tracking-widest text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all appearance-none cursor-pointer ${errors.contrato ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
              >
                <option value="" className="bg-card text-slate-500">Contrato...</option>
                {CONTRATOS.map(c => <option key={c} value={c} className="bg-card text-foreground">{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-2 pb-4 px-4 bg-accent-gold/5 rounded-3xl border border-accent-gold/10">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={splitOT}
                onChange={(e) => setSplitOT(e.target.checked)}
                className="w-5 h-5 rounded-lg border-border bg-background text-accent-gold focus:ring-accent-gold/20"
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground group-hover:text-accent-gold transition-colors">
                Dividir registro en 2 OTs
              </span>
            </label>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                Motivo {splitOT ? "(OT 1)" : ""}*
              </label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
                className={`w-full bg-background border rounded-2xl px-3 py-3 text-xs font-black uppercase tracking-widest text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all appearance-none cursor-pointer ${errors.motivo ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
              >
                <option value="" className="bg-card text-slate-500">Seleccione motivo...</option>
                {MOTIVOS.map(m => <option key={m} value={m} className="bg-card text-foreground">{m}</option>)}
              </select>
            </div>

            {splitOT && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5 pt-2 border-t border-accent-gold/10">
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Motivo (OT 2)*</label>
                <select value={motivo2} onChange={(e) => setMotivo2(e.target.value)}
                  className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-2xl px-3 py-3 text-xs font-black uppercase tracking-widest text-foreground outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none"
                >
                  <option value="" className="bg-card text-slate-500">Seleccione motivo...</option>
                  {MOTIVOS.map(m => <option key={m} value={m} className="bg-card text-foreground">{m}</option>)}
                </select>
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">Sector*</label>
              <input type="text" value={sector} onChange={(e) => setSector(e.target.value)}
                className={`w-full bg-background border rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all shadow-inner ${errors.sector ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                placeholder="Ej: Planta A" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                {splitOT ? "OT 1*" : "OT"}
              </label>
              <input type="text" value={ot} onChange={(e) => setOt(e.target.value.replace(/\D/g, "").slice(0, 12))}
                disabled={motivo === "OT Inexistente" && !splitOT}
                className={`w-full bg-background border rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all shadow-inner disabled:opacity-20 ${errors.ot ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                placeholder="8 - 12 dígitos" maxLength={12} />
            </div>
          </div>

          {splitOT && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
              <div>
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">OT 2*</label>
                <input 
                  type="text" 
                  value={ot2} 
                  onChange={(e) => setOt2(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  className="w-full bg-background border border-emerald-500/20 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  placeholder="OT con 8-12 dígitos" 
                  maxLength={12} 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">Horas Normales (OT 2)</label>
                <input 
                  type="number" step="0.5"
                  value={horasNormales2} 
                  onChange={(e) => setHorasNormales2(e.target.value)}
                  className="w-full bg-background border border-emerald-500/20 rounded-xl px-4 py-2 text-xs font-black text-foreground outline-none"
                  placeholder="Ej: 1" 
                />
              </div>
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">Horario*</label>
            <div className="flex items-center gap-3">
              <input type="time" value={horarioDesde} onChange={(e) => setHorarioDesde(e.target.value)}
                className="flex-1 bg-background border border-border rounded-2xl px-4 py-3 text-xs font-medium text-foreground outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all shadow-inner [color-scheme:light] dark:[color-scheme:dark]" />
              <div className="w-4 h-[1px] bg-border" />
              <input type="time" value={horarioHasta} onChange={(e) => setHorarioHasta(e.target.value)}
                className="flex-1 bg-background border border-border rounded-2xl px-4 py-3 text-xs font-medium text-foreground outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all shadow-inner [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <p className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] text-center mb-1">Horas y Detalles</p>
            <div className="grid grid-cols-1 gap-3">
              <HourInputRow label="Normales" val={horasNormales} setVal={setHorasNormales} mods={hsNormalesMods} setMods={setHsNormalesMods} />
              <div className="grid grid-cols-2 gap-3">
                <HourInputRow label="Al 50%" val={horas50} setVal={setHoras50} mods={hs50Mods} setMods={setHs50Mods} />
                <HourInputRow label="Al 100%" val={horas100} setVal={setHoras100} mods={hs100Mods} setMods={setHs100Mods} />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
              className="w-full bg-background/50 border border-border rounded-2xl px-4 py-3 text-xs font-medium text-foreground outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all resize-none shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-700"
              placeholder="Notas u observaciones adicionales..." />
          </div>

          <button type="submit" disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-accent-gold to-accent-gold-dark text-black font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all hover:from-accent-gold-dark hover:to-accent-gold active:scale-95 disabled:opacity-50 shadow-accent-gold/20 relative overflow-hidden group focus:ring-4 focus:ring-accent-gold/30"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12" />
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 opacity-70" />}
            <span className="relative z-10">{loading ? "Guardando..." : `Guardar ${selectedEmpleados.length > 1 ? `(${selectedEmpleados.length})` : "Registro"}`}</span>
          </button>
        </form>
      </div>
      
      <p className="text-center text-[9px] text-slate-600 dark:text-slate-500 mt-6 font-black uppercase tracking-[0.3em] opacity-80">
        SJG Management Hub · v2.0
      </p>
    </div>
    )}
    </>
  );
}
