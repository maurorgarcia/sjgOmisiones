"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, CheckCircle2, Loader2, Search, X, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
      <div className="flex items-center gap-3 w-full sm:w-1/3">
        <label className="text-sm font-medium text-slate-700 w-24">{label}</label>
        <input 
          type="number" step="0.5" min="0" 
          value={val} onChange={(e) => setVal(e.target.value)} 
          className="w-full border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none text-sm border-slate-200" 
          placeholder="Ej: 4.5" 
        />
      </div>
      <div className="flex items-center gap-4 w-full sm:w-2/3 mt-2 sm:mt-0 pt-2 sm:pt-0 sm:border-l sm:pl-4 border-slate-200">
        {(["insa", "polu", "noct"] as const).map(m => (
          <label key={m} className="flex items-center gap-1.5 text-xs text-slate-600 font-medium cursor-pointer uppercase hover:text-indigo-600 transition">
            <input 
              type="checkbox" 
              checked={mods[m]} 
              onChange={(e) => setMods({...mods, [m]: e.target.checked})} 
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            {m}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function CargaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: "success" | "error" | ""; message: string }>({ type: "", message: "" });

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
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
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
    if (saved) setFecha(saved);
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
    setSelectedEmpleados([]);
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
    // Check if already in list
    if (selectedEmpleados.some(e => e.legajo === emp.legajo)) {
      toast.error("Este empleado ya está en la lista.");
      return;
    }
    setSelectedEmpleados([...selectedEmpleados, emp]);
    setSearchQuery(""); // Clear search to allow adding more
    if (!contrato) setContrato(emp.contrato); // Default to first selected's contract
    setSuggestions([]);
    setShowSuggestions(false);
    setErrors((e) => ({ ...e, empleado: "" }));
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

  const updateFecha = (val: string) => {
    setFecha(val);
    sessionStorage.setItem("sjg_working_date", val);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    const hasNames = selectedEmpleados.length > 0 || searchQuery.trim();
    const hasLegajos = selectedEmpleados.length > 0 || legajoManual.trim();

    if (!hasNames) newErrors.empleado = "Debe ingresar o seleccionar al menos un empleado.";
    if (!hasLegajos) newErrors.legajo = "El legajo es requerido.";
    if (!contrato) newErrors.contrato = "Debe seleccionar un contrato.";
    if (!motivo) newErrors.motivo = "Debe seleccionar el motivo del error.";
    if (!sector.trim()) newErrors.sector = "El sector es requerido.";

    // OT validation: required only if motivo is NOT "OT Inexistente", and must be 10 digits
    if (motivo && motivo !== "OT Inexistente") {
      if (!ot.trim()) {
        newErrors.ot = "El número de OT es requerido para este motivo.";
      } else if (!/^\d{10}$/.test(ot.trim())) {
        newErrors.ot = "La OT debe tener exactamente 10 dígitos numéricos.";
      }
    } else if (ot.trim() && !/^\d{10}$/.test(ot.trim())) {
      newErrors.ot = "La OT debe tener exactamente 10 dígitos numéricos.";
    }

    // Horario: both fields are required
    if (!horarioDesde) newErrors.horarioDesde = "La hora de entrada es requerida.";
    if (!horarioHasta) newErrors.horarioHasta = "La hora de salida es requerida.";

    setErrors(newErrors);
    return Object.keys(newErrors).filter((k) => newErrors[k]).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSubmitStatus({ type: "", message: "" });

    // Ensure we parse the selected date correctly (adding timezone offset so it doesn't shift a day back)
    const [year, month, day] = fecha.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    // Force the time to noon UTC so it doesn't shift to the previous day in the DB
    const fechaISO = `${fecha}T12:00:00.000Z`;
    const dias = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
    const horarioStr = horarioDesde && horarioHasta ? `${horarioDesde} a ${horarioHasta}` : null;
    const employeesToSave = selectedEmpleados.length > 0 
      ? selectedEmpleados 
      : [{ nombre_apellido: searchQuery.trim(), legajo: legajoManual.trim() }];

    const errorsToSave = employeesToSave.map(emp => ({
      fecha: fechaISO,
      legajo: emp.legajo,
      nombre_apellido: emp.nombre_apellido,
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
    }));

    const { error } = await supabase.from("error_carga").insert(errorsToSave);

    if (error) {
      if (error.message.includes("contrato")) {
        const withoutContrato = errorsToSave.map(({ contrato: _c, ...rest }) => rest);
        const { error: err2 } = await supabase.from("error_carga").insert(withoutContrato);
        if (err2) { 
          toast.error("Error al guardar los registros."); 
          setLoading(false); 
          return; 
        }
      } else {
        toast.error("Error al guardar los registros.");
        setLoading(false);
        return;
      }
    }

    toast.success(`✅ ${errorsToSave.length} registros guardados correctamente.`);
    setLoading(false);
    // Reset
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
    setHorasNormales("");
    setHsNormalesMods({ insa: false, polu: false, noct: false });
    setHoras50("");
    setHs50Mods({ insa: false, polu: false, noct: false });
    setHoras100("");
    setHs100Mods({ insa: false, polu: false, noct: false });
    setErrors({});
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cargar Omisión / Error</h1>
          <p className="text-slate-500 text-sm mt-1">Registre un nuevo error arrojado por el sistema web de RRHH.</p>
        </div>
        <button
          onClick={() => window.open("/carga/mini", "MiniCarga", "width=450,height=800,menubar=no,toolbar=no,location=no,status=no")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 transition-all active:scale-95"
          title="Abrir como ventana flotante para multitarea"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>MODO VENTANA</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Employee search */}
          <div ref={searchRef} className="relative">
            <label className="block text-sm font-semibold mb-2 text-slate-700">
              Empleado <span className="text-slate-400 font-normal">(nombre o legajo)</span>
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                className={`w-full border rounded-xl pl-10 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm ${errors.empleado ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                placeholder="Buscar por nombre o legajo..."
                autoComplete="off"
              />
              {searchQuery && (
                <button type="button" onClick={clearEmpleado} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
              {searchLoading && !searchQuery && (
                <Loader2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
              )}
            </div>
            {errors.empleado && <p className="text-red-500 text-xs mt-1">{errors.empleado}</p>}

            {/* Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {suggestions.map((emp) => (
                  <button key={emp.legajo} type="button" onClick={() => selectEmpleado(emp)}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0">
                    <div className="font-semibold text-slate-800 text-sm">{emp.nombre_apellido}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Leg: {emp.legajo} · {emp.contrato}{emp.categoria ? ` · ${emp.categoria}` : ""}</div>
                  </button>
                ))}
              </div>
            )}

            {showSuggestions && suggestions.length === 0 && searchQuery.length >= 2 && !searchLoading && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 space-y-2">
                <p className="text-sm text-slate-500">No se encontró "{searchQuery}". Ingresá el legajo manualmente:</p>
                <input
                  type="text"
                  value={legajoManual}
                  onChange={(e) => setLegajoManual(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 ${errors.legajo ? "border-red-400" : "border-slate-300"}`}
                  placeholder="Ej: 60019454"
                />
              </div>
            )}

            {selectedEmpleados.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-500">
                <AnimatePresence>
                  {selectedEmpleados.map((emp) => (
                    <motion.div 
                      key={emp.legajo} 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-2 bg-indigo-50/80 border border-indigo-100 text-indigo-600 rounded-xl px-3 py-2 text-xs font-bold shadow-sm"
                    >
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                      {emp.nombre_apellido}
                      <button type="button" onClick={() => removeEmpleado(emp.legajo)} className="ml-1 hover:text-red-500 hover:bg-red-50 p-0.5 rounded-md transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Contrato + Motivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Fecha del Error <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  if (e.target.value) sessionStorage.setItem("sjg_working_date", e.target.value);
                }}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white text-sm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Contrato <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={contrato}
                onChange={(e) => { setContrato(e.target.value); setErrors((err) => ({ ...err, contrato: "" })); }}
                className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white text-sm ${errors.contrato ? "border-red-400 bg-red-50" : "border-slate-300"}`}
              >
                <option value="">Seleccionar contrato...</option>
                {CONTRATOS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.contrato && <p className="text-red-500 text-xs mt-1">{errors.contrato}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Motivo del Error <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={motivo}
                onChange={(e) => { setMotivo(e.target.value); setErrors((err) => ({ ...err, motivo: "", ot: "" })); }}
                className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white text-sm ${errors.motivo ? "border-red-400 bg-red-50" : "border-slate-300"}`}
              >
                <option value="">Seleccione un motivo...</option>
                {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {errors.motivo && <p className="text-red-500 text-xs mt-1">{errors.motivo}</p>}
            </div>
          </div>

          {/* Sector + OT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Sector / Área <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={sector}
                onChange={(e) => { setSector(e.target.value); setErrors((err) => ({ ...err, sector: "" })); }}
                className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm ${errors.sector ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                placeholder="Ej: Planta A, Mantenimiento..."
                list="sectores-comunes"
              />
              <datalist id="sectores-comunes">
                <option value="Planta A" /><option value="Planta B" />
                <option value="Mantenimiento" /><option value="Logística" />
                <option value="Administración" />
              </datalist>
              {errors.sector && <p className="text-red-500 text-xs mt-1">{errors.sector}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Número de OT
                {motivo && motivo !== "OT Inexistente" && <span className="text-red-500 ml-1">*</span>}
                <span className="text-slate-400 font-normal ml-1">(10 dígitos)</span>
              </label>
              <input
                type="text"
                value={ot}
                onChange={(e) => { setOt(e.target.value.replace(/\D/g, "").slice(0, 10)); setErrors((err) => ({ ...err, ot: "" })); }}
                disabled={motivo === "OT Inexistente"}
                className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm disabled:bg-slate-50 disabled:text-slate-400 ${errors.ot ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                placeholder={motivo === "OT Inexistente" ? "No aplica" : "Ej: 0012300456"}
                maxLength={10}
              />
              {ot && <p className="text-xs text-slate-400 mt-1">{ot.length}/10 dígitos</p>}
              {errors.ot && <p className="text-red-500 text-xs mt-1">{errors.ot}</p>}
            </div>
          </div>

          {/* Horario time pickers */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">
              Horario de Fichaje <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Entrada</label>
                <input
                  type="time"
                  value={horarioDesde}
                  onChange={(e) => { setHorarioDesde(e.target.value); setErrors((err) => ({ ...err, horarioDesde: "" })); }}
                  className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm ${errors.horarioDesde ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                />
                {errors.horarioDesde && <p className="text-red-500 text-xs mt-1">{errors.horarioDesde}</p>}
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Salida</label>
                <input
                  type="time"
                  value={horarioHasta}
                  onChange={(e) => { setHorarioHasta(e.target.value); setErrors((err) => ({ ...err, horarioHasta: "" })); }}
                  className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition text-sm ${errors.horarioHasta ? "border-red-400 bg-red-50" : "border-slate-300"}`}
                />
                {errors.horarioHasta && <p className="text-red-500 text-xs mt-1">{errors.horarioHasta}</p>}
              </div>
            </div>
          </div>

          {/* Hours details (New requirement) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Detalle de Horas Trabajadas <span className="text-slate-400 font-normal ml-1">(Opcional)</span></h3>
              <p className="text-xs text-slate-500 mt-0.5">Indique la cantidad de horas y defina si tienen modificadores adicionales.</p>
            </div>
            
            <div className="space-y-3">
              <HourInputRow label="Hs. Normales" val={horasNormales} setVal={setHorasNormales} mods={hsNormalesMods} setMods={setHsNormalesMods} />
              <HourInputRow label="Al 50%" val={horas50} setVal={setHoras50} mods={hs50Mods} setMods={setHs50Mods} />
              <HourInputRow label="Al 100%" val={horas100} setVal={setHoras100} mods={hs100Mods} setMods={setHs100Mods} />
            </div>
          </div>

          {/* Notas */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-sm font-semibold mb-2 text-slate-700">Notas adicionales</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none text-sm"
              placeholder="Algún comentario sobre el error..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={() => router.push("/")}
              className="px-6 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-[0.98]">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-w-[180px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-8 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98] text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando {selectedEmpleados.length > 1 ? `(${selectedEmpleados.length})` : ""}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar {selectedEmpleados.length > 1 ? `(${selectedEmpleados.length})` : "Registro"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
