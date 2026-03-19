"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { MOTIVOS, CONTRATOS } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Empleado = {
  nombre_apellido: string;
  legajo: string;
  contrato: string;
  categoria: string | null;
};

export type HourMods = { insa: boolean; polu: boolean; noct: boolean };

export type FormErrors = Partial<Record<string, string>>;

export type OTEntry = {
  id: string;
  motivo: string;
  ot: string;
  horasNormales: string;
  horas50: string;
  horas100: string;
};

const DIAS = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
const DEFAULT_MODS: HourMods = { insa: false, polu: false, noct: false };

const createEmptyOT = (): OTEntry => ({
  id: Math.random().toString(36).substr(2, 9),
  motivo: "",
  ot: "",
  horasNormales: "",
  horas50: "",
  horas100: "",
});

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCargaForm() {
  const router = useRouter();

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Employee search
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Empleado[]>([]);
  const [selectedEmpleados, setSelectedEmpleados] = useState<Empleado[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [legajoManual, setLegajoManual] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [fecha, setFechaRaw] = useState(new Date().toISOString().split("T")[0]);
  const [contrato, setContrato] = useState("");
  const [sector, setSector] = useState("");
  const [horarioDesde, setHorarioDesde] = useState("");
  const [horarioHasta, setHorarioHasta] = useState("");
  const [notas, setNotas] = useState("");

  // Multiple OTs feature
  const [ots, setOts] = useState<OTEntry[]>([createEmptyOT()]);

  // Hour mods (shared across all OTs for the day)
  const [hsNormalesMods, setHsNormalesMods] = useState<HourMods>(DEFAULT_MODS);
  const [hs50Mods, setHs50Mods] = useState<HourMods>(DEFAULT_MODS);
  const [hs100Mods, setHs100Mods] = useState<HourMods>(DEFAULT_MODS);

  // ─── Init: restore working date from session ──────────────────────────────
  useEffect(() => {
    const saved = sessionStorage.getItem("sjg_working_date");
    if (saved) setFechaRaw(saved);
  }, []);

  // ─── Close suggestions on outside click ──────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Fecha with session persistence ──────────────────────────────────────
  const setFecha = useCallback((val: string) => {
    setFechaRaw(val);
    if (val) sessionStorage.setItem("sjg_working_date", val);
  }, []);

  // ─── Employee search with debounce ────────────────────────────────────────
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setErrors((prev) => ({ ...prev, empleado: "" }));

    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        // Search via API route to avoid exposing Supabase key in client
        const res = await fetch(`/api/empleados?q=${encodeURIComponent(value)}`);
        const data: Empleado[] = res.ok ? await res.json() : [];
        setSuggestions(data);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  const selectEmpleado = useCallback((emp: Empleado) => {
    if (selectedEmpleados.some((e) => e.legajo === emp.legajo)) {
      toast.error("Este empleado ya está en la lista.");
      return;
    }
    setSelectedEmpleados((prev) => [...prev, emp]);
    setSearchQuery("");
    // Auto-fill contract from first selected employee
    if (!contrato) setContrato(emp.contrato);
    setSuggestions([]);
    setShowSuggestions(false);
    setErrors((prev) => ({ ...prev, empleado: "" }));
  }, [selectedEmpleados, contrato]);

  const addManualEmpleado = useCallback(() => {
    if (!searchQuery.trim() || !legajoManual.trim()) {
      toast.error("Complete nombre y legajo");
      return;
    }
    const virtualEmp: Empleado = {
      nombre_apellido: searchQuery.trim().toUpperCase(),
      legajo: legajoManual.trim(),
      contrato: contrato || "S/C",
      categoria: "MANUAL",
    };
    setSelectedEmpleados((prev) => [...prev, virtualEmp]);
    setSearchQuery("");
    setLegajoManual("");
    setShowSuggestions(false);
  }, [searchQuery, legajoManual, contrato]);

  const removeEmpleado = useCallback((legajo: string) => {
    setSelectedEmpleados((prev) => prev.filter((e) => e.legajo !== legajo));
  }, []);

  const clearSearch = useCallback(() => {
    setSelectedEmpleados([]);
    setSearchQuery("");
    setContrato("");
    setLegajoManual("");
  }, []);

  // ─── OT Management ────────────────────────────────────────────────────────
  const addOT = useCallback(() => {
    setOts((prev) => [...prev, createEmptyOT()]);
  }, []);

  const removeOT = useCallback((id: string) => {
    if (ots.length <= 1) return;
    setOts((prev) => prev.filter((o) => o.id !== id));
  }, [ots.length]);

  const updateOT = useCallback((id: string, updates: Partial<OTEntry>) => {
    setOts((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  }, []);

  // ─── Validation ───────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    const hasEmpleado = selectedEmpleados.length > 0 || searchQuery.trim();
    const hasLegajo = selectedEmpleados.length > 0 || legajoManual.trim();

    if (!hasEmpleado) newErrors.empleado = "Debe ingresar o seleccionar al menos un empleado.";
    if (!hasLegajo) newErrors.legajo = "El legajo es requerido.";
    if (!contrato) newErrors.contrato = "Debe seleccionar un contrato.";
    if (!sector.trim()) newErrors.sector = "El sector es requerido.";

    if (!horarioDesde) newErrors.horarioDesde = "La hora de entrada es requerida.";
    if (!horarioHasta) newErrors.horarioHasta = "La hora de salida es requerida.";

    ots.forEach((otEntry, idx) => {
      if (!otEntry.motivo) {
        newErrors[`motivo_${idx}`] = "Debe seleccionar el motivo.";
      }
      
      if (otEntry.motivo && otEntry.motivo !== "OT Inexistente") {
        if (!otEntry.ot.trim()) {
          newErrors[`ot_${idx}`] = "El número de OT es requerido.";
        } else if (!/^\d{8,12}$/.test(otEntry.ot.trim())) {
          newErrors[`ot_${idx}`] = "La OT debe tener entre 8 y 12 dígitos.";
        }
      } else if (otEntry.ot.trim() && !/^\d{8,12}$/.test(otEntry.ot.trim())) {
        newErrors[`ot_${idx}`] = "La OT debe tener entre 8 y 12 dígitos.";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [selectedEmpleados, searchQuery, legajoManual, contrato, sector, horarioDesde, horarioHasta, ots]);

  // ─── Reset form ───────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setSelectedEmpleados([]);
    setSearchQuery("");
    setContrato("");
    setSector("");
    setHorarioDesde("");
    setHorarioHasta("");
    setNotas("");
    setLegajoManual("");
    setHsNormalesMods(DEFAULT_MODS);
    setHs50Mods(DEFAULT_MODS);
    setHs100Mods(DEFAULT_MODS);
    setOts([createEmptyOT()]);
    setErrors({});
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    // Build date at noon UTC to avoid timezone day-shift issues
    const fechaISO = `${fecha}T12:00:00.000Z`;
    const [year, month, day] = fecha.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const horarioStr = horarioDesde && horarioHasta ? `${horarioDesde} a ${horarioHasta}` : null;

    // Build employee list — fall back to manual entry if none selected
    const employeesToSave: Empleado[] = selectedEmpleados.length > 0
      ? [...selectedEmpleados]
      : searchQuery.trim() && legajoManual.trim()
        ? [{ nombre_apellido: searchQuery.trim(), legajo: legajoManual.trim(), contrato: contrato || "S/C", categoria: null }]
        : [];

    if (employeesToSave.length === 0) {
      toast.error("Agregue al menos un empleado");
      setLoading(false);
      return;
    }

    // ─── Duplicate Detection ────────────────────────────────────────────────
    try {
      const { data: existing } = await supabase
        .from("error_carga")
        .select("nombre_apellido")
        .in("legajo", employeesToSave.map(e => e.legajo))
        .eq("fecha", fechaISO);

      if (existing && existing.length > 0) {
        const names = Array.from(new Set(existing.map(e => e.nombre_apellido))).join(", ");
        const msg = existing.length === 1 
          ? `Atención: ${names} ya tiene un registro cargado para esta fecha. ¿Desea cargar otro de todos modos?`
          : `Atención: Hay ${existing.length} registros existentes para estos empleados en la fecha seleccionada. ¿Desea continuar?`;
        
        if (!confirm(msg)) {
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("Error checking duplicates:", err);
    }

    const records: any[] = [];
    const multiOT = ots.length > 1;
    
    employeesToSave.forEach((emp) => {
      ots.forEach((otEntry, idx) => {
        records.push({
          fecha: fechaISO,
          legajo: emp.legajo,
          nombre_apellido: emp.nombre_apellido,
          motivo_error: otEntry.motivo,
          ot: otEntry.ot.trim() || null,
          sector: sector.trim(),
          horario: horarioStr,
          notas: multiOT ? `[OT ${idx + 1}/${ots.length}] ${notas.trim()}` : (notas.trim() || null),
          contrato,
          dia_semana: DIAS[selectedDate.getDay()],
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

    const { error } = await supabase.from("error_carga").insert(records);

    if (error) {
      // Fallback: retry without `contrato` field if DB schema doesn't have it yet
      if (error.message.includes("contrato")) {
        const withoutContrato = records.map(({ contrato: _c, ...rest }) => rest);
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

    toast.success(`✅ ${records.length} ${records.length === 1 ? "registro guardado" : "registros guardados"} correctamente.`);
    resetForm();
    setLoading(false);
  }, [validate, fecha, horarioDesde, horarioHasta, selectedEmpleados, searchQuery, legajoManual,
      contrato, sector, notas, ots, hsNormalesMods, hs50Mods, hs100Mods, resetForm]);

  return {
    // Refs
    searchRef,
    // UI
    loading,
    errors,
    setErrors,
    // Search
    searchQuery,
    suggestions,
    selectedEmpleados,
    searchLoading,
    showSuggestions,
    setShowSuggestions,
    legajoManual,
    setLegajoManual,
    handleSearch,
    selectEmpleado,
    addManualEmpleado,
    removeEmpleado,
    clearSearch,
    // Fields
    fecha,
    setFecha,
    contrato,
    setContrato,
    sector,
    setSector,
    horarioDesde,
    setHorarioDesde,
    horarioHasta,
    setHorarioHasta,
    notas,
    setNotas,
    // OT Array Management
    ots,
    addOT,
    removeOT,
    updateOT,
    // Hour Mods (shared)
    hsNormalesMods,
    setHsNormalesMods,
    hs50Mods,
    setHs50Mods,
    hs100Mods,
    setHs100Mods,
    // Actions
    handleSubmit,
    router,
  };
}

