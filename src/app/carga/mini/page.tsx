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
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
        <input 
          type="number" step="0.5" min="0" 
          value={val} onChange={(e) => setVal(e.target.value)} 
          className="w-20 border rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none text-sm border-slate-200 text-right" 
          placeholder="0" 
        />
      </div>
      <div className="flex items-center justify-around pt-1 border-t border-slate-200/50">
        {(["insa", "polu", "noct"] as const).map(m => (
          <label key={m} className="flex items-center gap-1 text-[10px] text-slate-500 font-bold cursor-pointer uppercase hover:text-indigo-600 transition">
            <input 
              type="checkbox" 
              checked={mods[m]} 
              onChange={(e) => setMods({...mods, [m]: e.target.checked})} 
              className="w-3 h-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            {m}
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
      toast.error("Error al guardar.");
      setLoading(false);
      return;
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
    <div className="min-h-screen bg-slate-50 p-4 pb-12">
      <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm sticky top-0 z-[60]">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Save className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-sm font-bold text-slate-800">Carga Flotante</h1>
        </div>
        <button 
          onClick={() => window.close()}
          className="text-slate-400 hover:text-slate-600 p-1"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-4 space-y-4" noValidate>
          
          {/* Empleado */}
          <div ref={searchRef} className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Empleado*</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className={`w-full border rounded-xl pl-9 pr-8 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition ${errors.empleado ? "border-red-400 bg-red-50" : "border-slate-200"}`}
                placeholder="Nombre o legajo..."
                autoComplete="off"
              />
              {searchQuery && (
                <button type="button" onClick={clearEmpleado} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {errors.empleado && <p className="text-red-500 text-[10px] ml-1 font-bold">{errors.empleado}</p>}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 left-4 right-4 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                {suggestions.map((emp) => (
                  <button key={emp.legajo} type="button" onClick={() => selectEmpleado(emp)}
                    className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0">
                    <div className="font-bold text-slate-800 text-xs">{emp.nombre_apellido}</div>
                    <div className="text-[10px] text-slate-500">Leg: {emp.legajo} · {emp.contrato}</div>
                  </button>
                ))}
              </div>
            )}

            {showSuggestions && suggestions.length === 0 && searchQuery.length >= 2 && !searchLoading && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                <p className="text-[10px] text-slate-500 font-medium">Legajo Manual:</p>
                <input
                  type="text"
                  value={legajoManual}
                  onChange={(e) => setLegajoManual(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Ej: 60019454"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Fecha*</label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Contrato*</label>
              <select value={contrato} onChange={(e) => setContrato(e.target.value)}
                className={`w-full border border-slate-200 rounded-xl px-1 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white ${errors.contrato ? "border-red-400 bg-red-50" : ""}`}
              >
                <option value="">Contrato...</option>
                {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Motivo*</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className={`w-full border border-slate-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white ${errors.motivo ? "border-red-400 bg-red-50" : ""}`}
            >
              <option value="">Seleccione motivo...</option>
              {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Sector*</label>
              <input type="text" value={sector} onChange={(e) => setSector(e.target.value)}
                className={`w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 ${errors.sector ? "border-red-400 bg-red-50" : ""}`}
                placeholder="Ej: Planta A" list="mini-sectores" />
              <datalist id="mini-sectores"><option value="Planta A" /><option value="Planta B" /><option value="Mantenimiento" /></datalist>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">OT</label>
              <input type="text" value={ot} onChange={(e) => setOt(e.target.value.replace(/\D/g, "").slice(0, 10))}
                disabled={motivo === "OT Inexistente"}
                className={`w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 ${errors.ot ? "border-red-400 bg-red-50" : ""}`}
                placeholder="10 dígitos" maxLength={10} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Horario*</label>
            <div className="flex items-center gap-2">
              <input type="time" value={horarioDesde} onChange={(e) => setHorarioDesde(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
              <span className="text-slate-400 text-xs font-bold">a</span>
              <input type="time" value={horarioHasta} onChange={(e) => setHorarioHasta(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Horas y Modificadores</p>
            <HourInputRow label="Normales" val={horasNormales} setVal={setHorasNormales} mods={hsNormalesMods} setMods={setHsNormalesMods} />
            <HourInputRow label="Al 50%" val={horas50} setVal={setHoras50} mods={hs50Mods} setMods={setHs50Mods} />
            <HourInputRow label="Al 100%" val={horas100} setVal={setHoras100} mods={hs100Mods} setMods={setHs100Mods} />
          </div>

          <div className="pt-2">
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
              placeholder="Notas opcionales..." />
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 text-sm active:scale-[0.97]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? "Gaurdando..." : "Guardar Registro"}
          </button>
        </form>
      </div>
      
      <p className="text-center text-[9px] text-slate-400 mt-4 font-bold uppercase tracking-widest">
        Multitarea SJG v1.0
      </p>
    </div>
  );
}
