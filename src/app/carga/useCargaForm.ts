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

const DIAS = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"];
const DEFAULT_MODS: HourMods = { insa: false, polu: false, noct: false };

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
  const [motivo, setMotivo] = useState("");
  const [ot, setOt] = useState("");
  const [sector, setSector] = useState("");
  const [horarioDesde, setHorarioDesde] = useState("");
  const [horarioHasta, setHorarioHasta] = useState("");
  const [notas, setNotas] = useState("");

  // Split OT feature
  const [splitOT, setSplitOT] = useState(false);
  const [motivo2, setMotivo2] = useState("");
  const [ot2, setOt2] = useState("");
  const [horasNormales2, setHorasNormales2] = useState("");
  const [horas502, setHoras502] = useState("");
  const [horas1002, setHoras1002] = useState("");

  // Hour details
  const [horasNormales, setHorasNormales] = useState("");
  const [hsNormalesMods, setHsNormalesMods] = useState<HourMods>(DEFAULT_MODS);
  const [horas50, setHoras50] = useState("");
  const [hs50Mods, setHs50Mods] = useState<HourMods>(DEFAULT_MODS);
  const [horas100, setHoras100] = useState("");
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

  // ─── Validation ───────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    const hasEmpleado = selectedEmpleados.length > 0 || searchQuery.trim();
    const hasLegajo = selectedEmpleados.length > 0 || legajoManual.trim();

    if (!hasEmpleado) newErrors.empleado = "Debe ingresar o seleccionar al menos un empleado.";
    if (!hasLegajo) newErrors.legajo = "El legajo es requerido.";
    if (!contrato) newErrors.contrato = "Debe seleccionar un contrato.";
    if (!motivo) newErrors.motivo = "Debe seleccionar el motivo del error.";
    if (!sector.trim()) newErrors.sector = "El sector es requerido.";

    if (motivo && motivo !== "OT Inexistente") {
      if (!ot.trim()) {
        newErrors.ot = "El número de OT es requerido para este motivo.";
      } else if (!/^\d{8,12}$/.test(ot.trim())) {
        newErrors.ot = "La OT debe tener entre 8 y 12 dígitos.";
      }
    } else if (ot.trim() && !/^\d{8,12}$/.test(ot.trim())) {
      newErrors.ot = "La OT debe tener entre 8 y 12 dígitos.";
    }

    if (!horarioDesde) newErrors.horarioDesde = "La hora de entrada es requerida.";
    if (!horarioHasta) newErrors.horarioHasta = "La hora de salida es requerida.";

    if (splitOT) {
      if (!motivo2) newErrors.motivo2 = "Seleccione motivo para la 2da OT.";
      if (!ot2.trim() && motivo2 !== "OT Inexistente") {
        newErrors.ot2 = "La 2da OT es requerida.";
      } else if (ot2.trim() && !/^\d{8,12}$/.test(ot2.trim())) {
        newErrors.ot2 = "La 2da OT debe tener entre 8 y 12 dígitos.";
      }
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((v) => !v);
  }, [selectedEmpleados, searchQuery, legajoManual, contrato, motivo, sector, ot, horarioDesde, horarioHasta, splitOT, motivo2, ot2]);

  // ─── Reset form ───────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
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
    setHsNormalesMods(DEFAULT_MODS);
    setHoras50("");
    setHs50Mods(DEFAULT_MODS);
    setHoras100("");
    setHs100Mods(DEFAULT_MODS);
    setSplitOT(false);
    setMotivo2("");
    setOt2("");
    setHorasNormales2("");
    setHoras502("");
    setHoras1002("");
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
    
    employeesToSave.forEach((emp) => {
      // Record 1
      records.push({
        fecha: fechaISO,
        legajo: emp.legajo,
        nombre_apellido: emp.nombre_apellido,
        motivo_error: motivo,
        ot: ot.trim() || null,
        sector: sector.trim(),
        horario: horarioStr,
        notas: splitOT ? `[OT 1/2] ${notas.trim()}` : (notas.trim() || null),
        contrato,
        dia_semana: DIAS[selectedDate.getDay()],
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

      // Optional Record 2
      if (splitOT) {
        records.push({
          fecha: fechaISO,
          legajo: emp.legajo,
          nombre_apellido: emp.nombre_apellido,
          motivo_error: motivo2,
          ot: ot2.trim() || null,
          sector: sector.trim(),
          horario: horarioStr,
          notas: `[OT 2/2] ${notas.trim()}`,
          contrato,
          dia_semana: DIAS[selectedDate.getDay()],
          horas_normales: horasNormales2 ? parseFloat(horasNormales2) : null,
          hs_normales_insa: hsNormalesMods.insa, // Re-use mods or set default?
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
      contrato, motivo, ot, sector, notas, horasNormales, hsNormalesMods,
      horas50, hs50Mods, horas100, hs100Mods, resetForm]);

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
    motivo,
    setMotivo,
    ot,
    setOt,
    sector,
    setSector,
    horarioDesde,
    setHorarioDesde,
    horarioHasta,
    setHorarioHasta,
    notas,
    setNotas,
    // Hours
    horasNormales,
    setHorasNormales,
    hsNormalesMods,
    setHsNormalesMods,
    horas50,
    setHoras50,
    hs50Mods,
    setHs50Mods,
    horas100,
    setHoras100,
    hs100Mods,
    setHs100Mods,
    // Split OT
    splitOT,
    setSplitOT,
    motivo2,
    setMotivo2,
    ot2,
    setOt2,
    horasNormales2,
    setHorasNormales2,
    horas502,
    setHoras502,
    horas1002,
    setHoras1002,
    // Actions
    handleSubmit,
    router,
  };
}
