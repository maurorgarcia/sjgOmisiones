"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Calendar, Building2, FileText, Hash, Search, X, Maximize2, CheckCircle2 } from "lucide-react";
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

const fieldLabel = "block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted";

const inputBase = (hasError?: boolean) =>
  `w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all ${
    hasError ? "border-red-400 bg-red-500/[0.03]" : "border-border"
  }`;

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
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 text-muted hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.05] rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Registrar Faltante</h1>
            <p className="text-sm text-muted mt-0.5">Anote personas que faltan en la planilla o sistema.</p>
          </div>
        </div>
        <button
          onClick={() => window.open("/faltantes/mini", "MiniFaltantes", "width=450,height=800,menubar=no,toolbar=no,location=no,status=no")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Modo Ventana</span>
        </button>
      </div>

      {/* Form card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>

          {/* Fecha */}
          <div>
            <label className={fieldLabel + " flex items-center gap-1.5"}>
              <Calendar className="w-3 h-3" /> Fecha
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => updateFecha(e.target.value)}
              className={inputBase(!!errors.fecha) + " [color-scheme:light] dark:[color-scheme:dark]"}
            />
          </div>

          {/* Empleado Search */}
          <div ref={searchRef}>
            <label className={fieldLabel + " flex items-center gap-1.5"}>
              <Search className="w-3 h-3" /> Empleado
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder="Buscar por nombre o legajo..."
                className={inputBase(!!errors.nombre) + " pr-9"}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setSuggestions([]); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground transition-colors rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {searchLoading && (
                <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-accent-gold animate-spin" />
              )}

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-card rounded-xl border border-border shadow-xl overflow-hidden">
                  <div className="max-h-[220px] overflow-y-auto">
                    {suggestions.map((emp) => (
                      <button
                        key={emp.legajo}
                        type="button"
                        onClick={() => selectEmpleado(emp)}
                        className="w-full text-left px-4 py-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all flex items-center justify-between group border-b border-border last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-accent-gold transition-colors">{emp.nombre_apellido}</p>
                          <p className="text-xs text-muted mt-0.5">Legajo: {emp.legajo}</p>
                        </div>
                        <span className="text-[11px] font-medium bg-background border border-border px-2 py-1 rounded-md text-muted">
                          {emp.contrato}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showSuggestions && suggestions.length === 0 && searchQuery.length >= 2 && !searchLoading && (
                <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-card rounded-xl border border-border shadow-xl p-4">
                  <p className="text-xs text-muted mb-3">Empleado no encontrado. Ingrese legajo manual:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={legajoManual}
                      onChange={(e) => setLegajoManual(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold transition-all"
                      placeholder="Legajo SAP..."
                    />
                    <button
                      type="button"
                      onClick={addManualEmpleado}
                      className="px-4 rounded-lg bg-accent-gold hover:bg-accent-gold-dark text-white font-semibold text-sm transition-colors"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {errors.nombre && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.nombre}</p>}

            {/* Selected List */}
            <AnimatePresence mode="popLayout">
              {selectedEmpleados.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border"
                >
                  {selectedEmpleados.map((emp) => (
                    <motion.div
                      key={emp.legajo}
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      className="inline-flex items-center gap-2 bg-accent-gold/10 border border-accent-gold/20 text-accent-gold px-3 py-1.5 rounded-md text-xs font-medium"
                    >
                      {emp.nombre_apellido}
                      <button type="button" onClick={() => removeEmpleado(emp.legajo)} className="hover:text-foreground transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Contrato */}
          <div>
            <label className={fieldLabel + " flex items-center gap-1.5"}>
              <Hash className="w-3 h-3" /> Contrato
            </label>
            <select
              value={contrato}
              onChange={(e) => setContrato(e.target.value)}
              className={inputBase(!!errors.contrato) + " appearance-none cursor-pointer"}
            >
              <option value="">Seleccione contrato...</option>
              {CONTRATOS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.contrato && <p className="text-red-500 text-[11px] mt-1 font-medium">{errors.contrato}</p>}
          </div>

          {/* Sector */}
          <div>
            <label className={fieldLabel + " flex items-center gap-1.5"}>
              <Building2 className="w-3 h-3" /> Sector
            </label>
            <input
              type="text"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              placeholder="Ej: Pañol/Logistica"
              list="sectores-faltantes"
              className={inputBase()}
            />
            <datalist id="sectores-faltantes">
              {SECTORES_FALTANTES.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* Motivo */}
          <div>
            <label className={fieldLabel + " flex items-center gap-1.5"}>
              <FileText className="w-3 h-3" /> Motivo
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Falta cargar"
              list="motivos-faltantes"
              className={inputBase()}
            />
            <datalist id="motivos-faltantes">
              {MOTIVOS_FALTANTES.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-gold hover:bg-accent-gold-dark text-white font-semibold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Guardando...</span></>
              ) : (
                <><CheckCircle2 className="w-4 h-4 opacity-80" /><span>Guardar {selectedEmpleados.length > 1 ? `(${selectedEmpleados.length}) Registros` : "Registro"}</span></>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Últimos cargados */}
      <div className="space-y-3">
        <h2 className="text-xs font-medium text-muted uppercase tracking-wide">Últimos cargados</h2>
        {fetchingRecent ? (
          <div className="h-12 bg-card border border-border rounded-lg animate-pulse" />
        ) : recentFaltantes.length === 0 ? (
          <p className="text-xs text-muted text-center py-4">Sin registros recientes</p>
        ) : (
          <div className="space-y-2">
            {recentFaltantes.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between hover:border-accent-gold/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-accent-gold/10 flex items-center justify-center text-[10px] font-semibold text-accent-gold uppercase">
                    {f.nombre_apellido.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{f.nombre_apellido}</p>
                    <p className="text-[10px] text-muted">{f.sector || "Sin sector"}{f.motivo ? ` · ${f.motivo}` : ""}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted font-mono">
                  {format(new Date(f.fecha), "dd MMM", { locale: es })}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
