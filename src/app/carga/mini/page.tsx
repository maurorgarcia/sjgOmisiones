"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Save, AlertCircle, CheckCircle2, Loader2, Search, X, Maximize2 } from "lucide-react";
import { toast } from "sonner";
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
    <div className="bg-black/40 p-3 rounded-2xl border border-white/5 space-y-2 shadow-inner group transition-all hover:border-amber-500/20">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
        <input 
          type="number" step="0.5" min="0" 
          value={val} onChange={(e) => setVal(e.target.value)} 
          className="w-20 bg-black/50 border border-white/5 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 outline-none text-xs font-bold text-slate-300 text-right appearance-none" 
          placeholder="0" 
        />
      </div>
      <div className="flex items-center justify-around pt-2 border-t border-white/5">
        {(["insa", "polu", "noct"] as const).map(m => (
          <label key={m} className={`flex items-center gap-1.5 text-[9px] font-black cursor-pointer uppercase transition-all tracking-tighter ${mods[m] ? 'text-amber-500' : 'text-slate-600 hover:text-slate-400'}`}>
            <div className="relative flex items-center">
              <input 
                type="checkbox" 
                checked={mods[m]} 
                onChange={(e) => setMods({...mods, [m]: e.target.checked})} 
                className="w-3.5 h-3.5 rounded-lg border-white/10 bg-black/40 text-amber-500 focus:ring-amber-500/20 cursor-pointer transition-all"
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
  const [loading, setLoading] = useState(false);
  
  // Autocomplete
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Empleado[]>([]);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
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
    setSelectedEmpleado(null);
    setContrato("");
    if (errors.empleado) setErrors((e) => ({ ...e, empleado: "" }));

    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }

    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      const isNumeric = /^\d+$/.test(value);
      let query = supabase.from("empleados").select("*").limit(8);
      if (isNumeric) {
        query = query.ilike("legajo", `${value}%`);
      } else {
        query = query.ilike("nombre_apellido", `%${value}%`);
      }
      const { data } = await query;
      setSuggestions(data || []);
      setShowSuggestions(true);
      setSearchLoading(false);
    }, 300);
  };

  const selectEmpleado = (emp: Empleado) => {
    setSelectedEmpleado(emp);
    setSearchQuery(emp.nombre_apellido);
    setContrato(emp.contrato);
    setSuggestions([]);
    setShowSuggestions(false);
    setErrors((e) => ({ ...e, empleado: "" }));
  };

  const clearEmpleado = () => {
    setSelectedEmpleado(null);
    setSearchQuery("");
    setContrato("");
    setLegajoManual("");
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const nombre = selectedEmpleado?.nombre_apellido || searchQuery.trim();
    const legajo = selectedEmpleado?.legajo || legajoManual.trim();

    if (!nombre) newErrors.empleado = "Requerido";
    if (!legajo) newErrors.legajo = "Requerido";
    if (!contrato) newErrors.contrato = "Requerido";
    if (!motivo) newErrors.motivo = "Requerido";
    if (!sector.trim()) newErrors.sector = "Requerido";

    if (motivo && motivo !== "OT Inexistente") {
      if (!ot.trim()) {
        newErrors.ot = "Requerido";
      } else if (!/^\d{10}$/.test(ot.trim())) {
        newErrors.ot = "Debe tener 10 dígitos";
      }
    } else if (ot.trim() && !/^\d{10}$/.test(ot.trim())) {
      newErrors.ot = "Debe tener 10 dígitos";
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

    const errorToSave = {
      fecha: fechaISO,
      legajo: selectedEmpleado?.legajo || legajoManual.trim(),
      nombre_apellido: selectedEmpleado?.nombre_apellido || searchQuery.trim(),
      motivo_error: motivo,
      ot: ot.trim() || null,
      sector: sector.trim(),
      horario: horarioStr,
      notas: notas.trim() || null,
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
    };

    const { error } = await supabase.from("error_carga").insert([errorToSave]);

    if (error) {
      if (error.message.includes("contrato")) {
        const { contrato: _c, ...withoutContrato } = errorToSave;
        const { error: err2 } = await supabase.from("error_carga").insert([withoutContrato]);
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

    toast.success("✅ Registro guardado.");
    setLoading(false);
    
    // Reset fields but keep state relevant for multiple loads
    setSelectedEmpleado(null);
    setSearchQuery("");
    setContrato("");
    setMotivo("");
    setOt("");
    setSector("");
    setHorarioDesde("");
    setHorarioHasta("");
    setNotas("");
    setLegajoManual("");
    setHorasNormales("");
    setHsNormalesMods({ insa: false, polu: false, noct: false });
    setHoras50("");
    setHs50Mods({ insa: false, polu: false, noct: false });
    setHoras100("");
    setHs100Mods({ insa: false, polu: false, noct: false });
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] p-4 pb-12 font-sans selection:bg-amber-500/30">
      <div className="flex items-center justify-between mb-4 bg-slate-900/40 backdrop-blur-xl p-4 rounded-[2rem] border border-white/5 shadow-2xl sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-xs font-black text-white tracking-tight uppercase">Mini Omisiones</h1>
            <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.15em] mt-0.5">SJG Gestión</p>
          </div>
        </div>
        <button 
          onClick={() => window.close()}
          className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-slate-500 hover:text-white"
          title="Cerrar ventana"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-slate-950/40 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          
          {/* Empleado */}
          <div ref={searchRef} className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">
              <Search className="w-3 h-3 group-hover:text-amber-500 transition-colors" /> Empleado*
            </label>
            <div className="relative group/input">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className={`w-full bg-black/40 border rounded-2xl pl-10 pr-10 py-3 text-xs font-medium text-slate-300 placeholder:text-slate-700 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all shadow-inner ${errors.empleado ? "border-red-500/50 bg-red-500/5" : "border-white/5"}`}
                placeholder="Nombre o legajo..."
                autoComplete="off"
              />
              <Search className="w-4 h-4 text-slate-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within/input:text-amber-500/50 transition-colors" />
              {searchQuery && (
                <button type="button" onClick={clearEmpleado} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {errors.empleado && <p className="text-red-500 text-[9px] ml-1 font-black uppercase tracking-widest leading-none mt-1">{errors.empleado}</p>}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-[110%] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl max-h-60 overflow-y-auto custom-scrollbar">
                {suggestions.map((emp) => (
                  <button key={emp.legajo} type="button" onClick={() => selectEmpleado(emp)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group/item">
                    <p className="text-[11px] font-bold text-slate-200 uppercase tracking-tight group-hover/item:text-amber-400 transition-colors">{emp.nombre_apellido}</p>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Leg: {emp.legajo} · {emp.contrato}</p>
                  </button>
                ))}
              </div>
            )}

            {showSuggestions && suggestions.length === 0 && searchQuery.length >= 2 && !searchLoading && (
              <div className="p-4 bg-amber-500/5 rounded-2xl border border-dashed border-amber-500/20 space-y-2 animate-in fade-in zoom-in duration-300">
                <p className="text-[9px] text-amber-500/80 font-black uppercase tracking-widest">Legajo Manual:</p>
                <input
                  type="text"
                  value={legajoManual}
                  onChange={(e) => setLegajoManual(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-300 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all"
                  placeholder="Ej: 60019454"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">Fecha*</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-3 py-3 text-xs font-medium text-slate-300 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all [color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">Contrato*</label>
              <select value={contrato} onChange={(e) => setContrato(e.target.value)}
                className={`w-full bg-black/40 border rounded-2xl px-3 py-3 text-xs font-medium text-slate-300 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all appearance-none cursor-pointer ${errors.contrato ? "border-red-500/50 bg-red-500/5" : "border-white/5"}`}
              >
                <option value="" className="bg-slate-900 text-slate-500">Contrato...</option>
                {CONTRATOS.map(c => <option key={c} value={c} className="bg-slate-900 text-slate-300">{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">Motivo*</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className={`w-full bg-black/40 border rounded-2xl px-3 py-3 text-xs font-medium text-slate-300 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all appearance-none cursor-pointer ${errors.motivo ? "border-red-500/50 bg-red-500/5" : "border-white/5"}`}
            >
              <option value="" className="bg-slate-900 text-slate-500">Seleccione motivo...</option>
              {MOTIVOS.map(m => <option key={m} value={m} className="bg-slate-900 text-slate-300">{m}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">Sector*</label>
              <input type="text" value={sector} onChange={(e) => setSector(e.target.value)}
                className={`w-full bg-black/40 border rounded-2xl px-4 py-3 text-xs font-medium text-slate-300 placeholder:text-slate-700 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all shadow-inner ${errors.sector ? "border-red-500/50 bg-red-500/5" : "border-white/5"}`}
                placeholder="Ej: Planta A" list="mini-sectores" />
              <datalist id="mini-sectores"><option value="Planta A" /><option value="Planta B" /><option value="Mantenimiento" /></datalist>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">OT</label>
              <input type="text" value={ot} onChange={(e) => setOt(e.target.value.replace(/\D/g, "").slice(0, 10))}
                disabled={motivo === "OT Inexistente"}
                className={`w-full bg-black/40 border rounded-2xl px-4 py-3 text-xs font-medium text-slate-300 placeholder:text-slate-700 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all shadow-inner disabled:opacity-20 ${errors.ot ? "border-red-500/50 bg-red-500/5" : "border-white/5"}`}
                placeholder="10 dígitos" maxLength={10} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1.5">Horario*</label>
            <div className="flex items-center gap-3">
              <input type="time" value={horarioDesde} onChange={(e) => setHorarioDesde(e.target.value)}
                className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-xs font-medium text-slate-300 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all shadow-inner [color-scheme:dark]" />
              <div className="w-4 h-[1px] bg-white/10" />
              <input type="time" value={horarioHasta} onChange={(e) => setHorarioHasta(e.target.value)}
                className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-xs font-medium text-slate-300 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all shadow-inner [color-scheme:dark]" />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] text-center mb-1">Horas y Detalles</p>
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
              className="w-full bg-black/20 border border-white/5 rounded-2xl px-4 py-3 text-xs font-medium text-slate-400 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all resize-none shadow-inner placeholder:text-slate-800"
              placeholder="Notas u observaciones adicionales..." />
          </div>

          <button type="submit" disabled={loading}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all hover:from-amber-400 hover:to-amber-500 active:scale-95 disabled:opacity-50 shadow-amber-900/40 relative overflow-hidden group focus:ring-4 focus:ring-amber-500/30"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 skew-x-12" />
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 opacity-70" />}
            <span className="relative z-10">{loading ? "Guardando..." : "Finalizar Registro"}</span>
          </button>
        </form>
      </div>
      
      <p className="text-center text-[9px] text-slate-700 mt-6 font-black uppercase tracking-[0.3em] opacity-40">
        SJG Management Hub · v2.0
      </p>
    </div>
  );
}
