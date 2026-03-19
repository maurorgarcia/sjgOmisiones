"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ErrorCarga, PAGE_SIZE } from "@/types";

type FilterStatus = "todos" | "pendientes" | "resueltos";
type SortConfig = { key: string; direction: "asc" | "desc" } | null;

interface UseErroresOptions {
  defaultFiltro?: FilterStatus;
  persistFilters?: boolean;
}

export function useErrores({ defaultFiltro = "pendientes", persistFilters = false }: UseErroresOptions = {}) {
  const getTodayLocal = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60 * 1000).toISOString().split("T")[0];
  };

  const [errores, setErrores] = useState<ErrorCarga[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");

  const [filtro, setFiltroRaw] = useState<FilterStatus>(() => {
    if (!persistFilters || typeof window === "undefined") return defaultFiltro;
    const saved = sessionStorage.getItem("sjg_filtro");
    return (saved === "todos" || saved === "pendientes" || saved === "resueltos") ? saved : defaultFiltro;
  });

  const [filtroMotivo, setFiltroMotivoRaw] = useState<string>(() => {
    if (!persistFilters || typeof window === "undefined") return "todos";
    return sessionStorage.getItem("sjg_filtro_motivo") || "todos";
  });

  const [filtroSector, setFiltroSectorRaw] = useState<string>(() => {
    if (!persistFilters || typeof window === "undefined") return "";
    return sessionStorage.getItem("sjg_filtro_sector") || "";
  });

  const [fechaFiltro, setFechaFiltroRaw] = useState<string>(() => {
    if (typeof window === "undefined") return getTodayLocal();
    return sessionStorage.getItem("sjg_working_date") || getTodayLocal();
  });

  const [fechaHasta, setFechaHastaRaw] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("sjg_fecha_hasta") || "";
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "nombre_apellido", direction: "asc" });

  // ✅ Ref para acceder a los filtros activos dentro del handler de realtime
  // sin necesidad de re-suscribir el canal cada vez que cambia un filtro
  const activeFiltersRef = useRef({ filtro, filtroMotivo, filtroSector, fechaFiltro, fechaHasta, search });
  useEffect(() => {
    activeFiltersRef.current = { filtro, filtroMotivo, filtroSector, fechaFiltro, fechaHasta, search };
  }, [filtro, filtroMotivo, filtroSector, fechaFiltro, fechaHasta, search]);

  const setFiltro = useCallback((val: FilterStatus) => {
    setFiltroRaw(val);
    if (persistFilters) sessionStorage.setItem("sjg_filtro", val);
  }, [persistFilters]);

  const setFiltroMotivo = useCallback((val: string) => {
    setFiltroMotivoRaw(val);
    if (persistFilters) sessionStorage.setItem("sjg_filtro_motivo", val);
  }, [persistFilters]);

  const setFiltroSector = useCallback((val: string) => {
    setFiltroSectorRaw(val);
    if (persistFilters) sessionStorage.setItem("sjg_filtro_sector", val);
  }, [persistFilters]);

  const setFechaFiltro = useCallback((val: string) => {
    setFechaFiltroRaw(val);
    if (val) sessionStorage.setItem("sjg_working_date", val);
  }, []);

  const setFechaHasta = useCallback((val: string) => {
    setFechaHastaRaw(val);
    if (val) sessionStorage.setItem("sjg_fecha_hasta", val);
    else sessionStorage.removeItem("sjg_fecha_hasta");
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const buildQuery = useCallback(() => {
    let query = supabase.from("error_carga").select("*");

    if (sortConfig) {
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === "asc" });
      if (sortConfig.key !== "fecha") {
        query = query.order("fecha", { ascending: false });
      }
    } else {
      query = query.order("nombre_apellido", { ascending: true });
    }

    if (fechaFiltro) {
      const startIso = `${fechaFiltro}T00:00:00.000Z`;
      const endIso = fechaHasta ? `${fechaHasta}T23:59:59.999Z` : `${fechaFiltro}T23:59:59.999Z`;
      query = query.gte("fecha", startIso).lte("fecha", endIso);
    }

    if (filtro === "pendientes") query = query.eq("resuelto", false);
    if (filtro === "resueltos") query = query.eq("resuelto", true);
    if (filtroMotivo !== "todos") query = query.eq("motivo_error", filtroMotivo);
    if (filtroSector.trim()) query = query.ilike("sector", `%${filtroSector.trim()}%`);

    if (search.trim()) {
      const q = search.trim();
      query = query.or(`nombre_apellido.ilike.%${q}%,legajo.ilike.%${q}%,ot.ilike.%${q}%`);
    }

    return query;
  }, [sortConfig, fechaFiltro, fechaHasta, filtro, filtroMotivo, filtroSector, search]);

  const fetchErrores = useCallback(async () => {
    setLoading(true);
    const { data, error } = await buildQuery().range(0, PAGE_SIZE - 1);
    if (data) {
      setErrores(data);
      setHasMore(data.length === PAGE_SIZE);
    }
    if (error) console.error(error);
    setLoading(false);
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const from = errores.length;
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (data) {
      setErrores((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }
    if (error) console.error(error);
    setLoadingMore(false);
  }, [loadingMore, hasMore, errores.length, buildQuery]);

  useEffect(() => {
    fetchErrores();
  }, [fetchErrores]);

  // ✅ FIX: realtime INSERT ahora valida TODOS los filtros activos antes de agregar el registro
  // Antes solo chequeaba `resuelto`, ignorando fecha, sector, motivo y búsqueda
  useEffect(() => {
    const channel = supabase
      .channel(`errores-rt-${Math.random()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "error_carga" }, (payload) => {
        const row = payload.new as ErrorCarga;
        const f = activeFiltersRef.current;

        // Validar estado resuelto
        const matchesStatus =
          f.filtro === "todos" ||
          (f.filtro === "pendientes" && !row.resuelto) ||
          (f.filtro === "resueltos" && row.resuelto);
        if (!matchesStatus) return;

        // Validar motivo
        if (f.filtroMotivo !== "todos" && row.motivo_error !== f.filtroMotivo) return;

        // Validar sector
        if (f.filtroSector.trim() && !row.sector?.toLowerCase().includes(f.filtroSector.trim().toLowerCase())) return;

        // Validar fecha
        if (f.fechaFiltro) {
          const rowDate = row.fecha.split("T")[0];
          if (rowDate < f.fechaFiltro) return;
          if (f.fechaHasta && rowDate > f.fechaHasta) return;
          if (!f.fechaHasta && rowDate !== f.fechaFiltro) return;
        }

        // Validar búsqueda
        if (f.search.trim()) {
          const q = f.search.trim().toLowerCase();
          const matchesSearch =
            row.nombre_apellido?.toLowerCase().includes(q) ||
            row.legajo?.toLowerCase().includes(q) ||
            row.ot?.toLowerCase().includes(q);
          if (!matchesSearch) return;
        }

        setErrores((prev) => [row, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "error_carga" }, (payload) => {
        const updated = payload.new as ErrorCarga;
        setErrores((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "error_carga" }, (payload) => {
        const deleted = payload.old as { id: number };
        setErrores((prev) => prev.filter((e) => e.id !== deleted.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // canal se monta una sola vez, lee filtros por ref

  return {
    errores,
    loading,
    loadingMore,
    hasMore,
    filtro,
    filtroMotivo,
    filtroSector,
    fechaFiltro,
    fechaHasta,
    sortConfig,
    setFiltro,
    setFiltroMotivo,
    setFiltroSector,
    setFechaFiltro,
    setFechaHasta,
    search,
    setSearch,
    handleSort,
    fetchErrores,
    loadMore,
  };
}
