"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Save, Loader2, ArrowLeft, Calendar, Building2, FileText, Hash, Search, X, Maximize2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CONTRATOS, SECTORES_FALTANTES, MOTIVOS_FALTANTES } from "@/types";

import { format } from "date-fns";
import { es } from "date-fns/locale";

type Empleado = {
  nombre_apellido: string;
  legajo: string;
  contrato: string;
};

type RecentFaltante = {
  id: number;
  nombre_apellido: string;
  fecha: string;
  sector: string | null;
  motivo: string | null;
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
  const [legajoManual, setLegajoManual] = useState("");

  // Recent entries
  const [recentFaltantes, setRecentFaltantes] = useState<RecentFaltante[]>([]);
  const [fetchingRecent, setFetchingRecent] = useState(false);

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
    fetchRecent();
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchRecent = async () => {
    setFetchingRecent(true);
    const { data } = await supabase
      .from("faltantes")
      .select("id, nombre_apellido, fecha, sector, motivo")
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setRecentFaltantes(data);
    setFetchingRecent(false);
  };

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
    if (selectedEmpleados.some((e) => e.legajo === emp.legajo)) {
      toast.error("Este empleado ya está en la lista.");
      return;
    }
    setSelectedEmpleados([...selectedEmpleados, emp]);
    setSearchQuery("");
    if (!contrato) setContrato(emp.contrato);
    setSuggestions([]);
    setShowSuggestions(false);
    setErrors((e) => ({ ...e, nombre: "" }));
  };

  const addManualEmpleado = () => {
    if (!searchQuery.trim() || !legajoManual.trim()) {
      toast.error("Nombre y legajo requeridos");
      return;
    }
    const virtualEmp: Empleado = {
      nombre_apellido: searchQuery.trim().toUpperCase(),
      legajo: legajoManual.trim(),
      contrato: contrato || "S/C",
    };
    setSelectedEmpleados([...selectedEmpleados, virtualEmp]);
    setSearchQuery("");
    setLegajoManual("");
    setShowSuggestions(false);
    setErrors((e) => ({ ...e, nombre: "" }));
  };

  const removeEmpleado = (legajo: string) => {
    setSelectedEmpleados((prev) => prev.filter((e) => e.legajo !== legajo));
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
    const employeesToSave = [...selectedEmpleados];

    if (employeesToSave.length === 0) {
      if (searchQuery.trim() && legajoManual.trim()) {
        employeesToSave.push({
          nombre_apellido: searchQuery.trim(),
          legajo: legajoManual.trim(),
          contrato: contrato || "S/C",
        });
      } else {
        toast.error("Seleccione o agregue al menos un empleado");
        setLoading(false);
        return;
      }
    }

    const entriesToSave = employeesToSave.map((emp) => ({
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
    setSearchQuery("");
    setSelectedEmpleados([]);
    setSector("");
    setMotivo("");
    setErrors({});
    fetchRecent();
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-10 bg-accent-gold rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">Registrar Faltante</h1>
            <p className="text-slate-600 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Anote personas que faltan en la planilla o sistema.</p>
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
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
                <Calendar className="w-3.5 h-3.5 group-hover:text-accent-gold transition-colors" /> Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => updateFecha(e.target.value)}
                className="w-full bg-background border border-border rounded-2xl px-5 py-4 text-xs font-medium text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            {/* ✅ FIX: Búsqueda de Empleado — mismo fix que EmpleadoSearch:
                `relative` movido al wrapper del input, no al div que incluye el label */}
            <div className="space-y-2" ref={searchRef}>
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
                <Search className="w-3.5 h-3.5 group-hover:text-accent-gold transition-colors" /> Empleado
              </label>

              <div className="relative">
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

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-[calc(100%+8px)] bg-card rounded-[2rem] border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="max-h-[250px] overflow-y-auto">
                      {suggestions.map((emp) => (
                        <button
                          key={emp.legajo}
                          type="button"
                          onClick={() => selectEmpleado(emp)}
                          className="w-full text-left px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-between group border-b border-border last:border-0"
                        >
                          <div>
                            <p className="text-sm font-bold text-foreground group-hover:text-accent-gold transition-colors uppercase tracking-tight">{emp.nombre_apellido}</p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-500 font-black uppercase tracking-widest mt-0.5">Legajo: {emp.legajo}</p>
                          </div>
                          <div className="text-[10px] font-black text-accent-gold/70 uppercase bg-accent-gold/5 px-2.5 py-1.5 rounded-xl border border-accent-gold/10 group-hover:bg-accent-gold group-hover:text-black group-hover:border-transparent transition-all">
                            {emp.contrato}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showSuggestions && suggestions.length === 0 && searchQuery.length >= 2 && !searchLoading && (
                  <div className="absolute z-50 left-0 right-0 top-[calc(100%+8px)] bg-card rounded-[2rem] border border-border shadow-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <p className="text-[10px] text-slate-600 dark:text-slate-500 font-black uppercase tracking-widest mb-3">Empleado no encontrado. Ingrese legajo manual:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={legajoManual}
                        onChange={(e) => setLegajoManual(e.target.value)}
                        className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm font-black outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all"
                        placeholder="Legajo SAP..."
                      />
                      <button
                        type="button"
                        onClick={addManualEmpleado}
                        className="px-6 rounded-xl bg-accent-gold text-black font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg shadow-accent-gold/10"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {errors.nombre && (
                <p className="text-red-500 text-xs mt-1 font-bold">{errors.nombre}</p>
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
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
                <Hash className="w-3.5 h-3.5 group-hover:text-accent-gold transition-colors" /> Contrato
              </label>
              <select
                value={contrato}
                onChange={(e) => setContrato(e.target.value)}
                className={`w-full bg-background border rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all appearance-none cursor-pointer ${errors.contrato ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
              >
                <option value="" className="bg-card">Seleccione contrato...</option>
                {CONTRATOS.map((c) => <option key={c} value={c} className="bg-card">{c}</option>)}
              </select>
              {errors.contrato && (
                <p className="text-red-500 text-xs mt-1 font-bold">{errors.contrato}</p>
              )}
            </div>

            {/* Sector */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
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
                {SECTORES_FALTANTES.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>

            {/* Motivo */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
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
                {MOTIVOS_FALTANTES.map((m) => <option key={m} value={m} />)}
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

      <div className="mt-12 space-y-4">
        <div className="flex items-center gap-3 ml-2">
          <div className="w-1.5 h-4 bg-accent-gold/40 rounded-full" />
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Últimos cargados</h3>
        </div>

        <div className="space-y-3">
          {fetchingRecent ? (
            <div className="h-20 bg-card/20 rounded-3xl border border-border/50 animate-pulse" />
          ) : recentFaltantes.length === 0 ? (
            <div className="p-8 text-center bg-card/20 rounded-3xl border border-border/50 border-dashed">
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Aún no hay registros recientes</p>
            </div>
          ) : (
            recentFaltantes.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group bg-card/40 hover:bg-card/60 rounded-2xl border border-border p-4 flex items-center justify-between transition-all backdrop-blur-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-background flex flex-col items-center justify-center text-[8px] font-black text-slate-500 border border-border">
                    <span className="text-accent-gold">{format(new Date(f.fecha), "dd")}</span>
                    <span className="opacity-50 uppercase">{format(new Date(f.fecha), "MMM", { locale: es })}</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-foreground uppercase tracking-tight group-hover:text-accent-gold transition-colors">{f.nombre_apellido}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{f.sector || "S/Sector"}</span>
                      {f.motivo && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <span className="text-[9px] font-bold text-accent-gold/60 uppercase tracking-widest">{f.motivo}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <p className="mt-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-500 opacity-60">
        SJG Montajes Industriales · Sistema de Gestión
      </p>
    </div>
  );
}
