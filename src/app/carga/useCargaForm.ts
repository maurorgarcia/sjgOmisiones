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
  hsNormalesMods: HourMods;
  hs50Mods: HourMods;
  hs100Mods: HourMods;
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
  hsNormalesMods: { ...DEFAULT_MODS },
  hs50Mods: { ...DEFAULT_MODS },
  hs100Mods: { ...DEFAULT_MODS },
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
  const [activeOTIndex, setActiveOTIndex] = useState(0);

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
    const newOT = createEmptyOT();
    setOts((prev) => [...prev, newOT]);
    setActiveOTIndex(ots.length); // Switch to the new OT
  }, [ots.length]);

  const removeOT = useCallback((id: string) => {
    if (ots.length <= 1) return;
    const indexToRemove = ots.findIndex(o => o.id === id);
    setOts((prev) => prev.filter((o) => o.id !== id));
    if (activeOTIndex >= indexToRemove && activeOTIndex > 0) {
      setActiveOTIndex(prev => prev - 1);
    }
  }, [ots, activeOTIndex]);

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
      if (!otEntry.motivo) newErrors[`motivo_${idx}`] = "Requerido.";
      if (otEntry.motivo && otEntry.motivo !== "OT Inexistente") {
        if (!otEntry.ot.trim()) {
          newErrors[`ot_${idx}`] = "Requerido.";
        } else if (!/^\d{8,12}$/.test(otEntry.ot.trim())) {
          newErrors[`ot_${idx}`] = "8-12 dígitos.";
        }
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
    setOts([createEmptyOT()]);
    setActiveOTIndex(0);
    setErrors({});
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Por favor, revise los errores en el formulario.");
      return;
    }

    setLoading(true);
    const fechaISO = `${fecha}T12:00:00.000Z`;
    const [year, month, day] = fecha.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const horarioStr = horarioDesde && horarioHasta ? `${horarioDesde} a ${horarioHasta}` : null;

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

    const records: any[] = [];
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
          notas: ots.length > 1 ? `[OT ${idx + 1}/${ots.length}] ${notas.trim()}` : (notas.trim() || null),
          contrato,
          dia_semana: DIAS[selectedDate.getDay()],
          horas_normales: otEntry.horasNormales ? parseFloat(otEntry.horasNormales) : null,
          hs_normales_insa: otEntry.hsNormalesMods.insa,
          hs_normales_polu: otEntry.hsNormalesMods.polu,
          hs_normales_noct: otEntry.hsNormalesMods.noct,
          horas_50: otEntry.horas50 ? parseFloat(otEntry.horas50) : null,
          hs_50_insa: otEntry.hs50Mods.insa,
          hs_50_polu: otEntry.hs50Mods.polu,
          hs_50_noct: otEntry.hs50Mods.noct,
          horas_100: otEntry.horas100 ? parseFloat(otEntry.horas100) : null,
          hs_100_insa: otEntry.hs100Mods.insa,
          hs_100_polu: otEntry.hs100Mods.polu,
          hs_100_noct: otEntry.hs100Mods.noct,
        });
      });
    });

    const { error } = await supabase.from("error_carga").insert(records);
    if (error) {
      toast.error("Error al guardar los registros.");
    } else {
      toast.success(`✅ ${records.length} registros guardados correctamente.`);
      resetForm();
    }
    setLoading(false);
  }, [validate, fecha, horarioDesde, horarioHasta, selectedEmpleados, searchQuery, legajoManual, contrato, sector, notas, ots, resetForm]);

  return {
    searchRef,
    loading,
    errors,
    setErrors,
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
    ots,
    activeOTIndex,
    setActiveOTIndex,
    addOT,
    removeOT,
    updateOT,
    handleSubmit,
    router,
  };
}
