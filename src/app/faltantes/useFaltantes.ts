"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Faltante, PAGE_SIZE } from "@/types";

type SortConfig = { key: string; direction: "asc" | "desc" } | null;

export function useFaltantes() {
  const [data, setData] = useState<Faltante[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "nombre_apellido",
    direction: "asc",
  });
  const [fechaDesde, setFechaDesde] = useState<string>(() => {
    if (typeof window === "undefined") return new Date().toISOString().split("T")[0];
    return sessionStorage.getItem("sjg_working_date") || new Date().toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("sjg_fecha_hasta") || "";
  });
  const [searchQuery, setSearchQuery] = useState("");

  const [checkedNames, setCheckedNames] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = sessionStorage.getItem("sjg_checked_names");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const buildQuery = useCallback(() => {
    let query = supabase.from("faltantes").select("*");

    if (fechaDesde) {
      const startIso = `${fechaDesde}T00:00:00.000Z`;
      const endIso = fechaHasta
        ? `${fechaHasta}T23:59:59.999Z`
        : `${fechaDesde}T23:59:59.999Z`;
      query = query.gte("fecha", startIso).lte("fecha", endIso);
    }

    if (sortConfig) {
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === "asc" });
      if (sortConfig.key !== "fecha") {
        query = query.order("fecha", { ascending: false });
      }
    } else {
      query = query.order("nombre_apellido", { ascending: true });
    }

    return query;
  }, [fechaDesde, fechaHasta, sortConfig]);

  const fetchFaltantes = useCallback(async () => {
    setLoading(true);
    const { data: res, error } = await buildQuery().range(0, PAGE_SIZE - 1);
    if (res) {
      setData(res);
      setHasMore(res.length === PAGE_SIZE);
    }
    if (error) {
      console.error(error);
      toast.error("Error al cargar los datos. Verifique la conexión.");
    }
    setLoading(false);
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const from = data.length;
    const { data: res, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (res) {
      setData((prev) => [...prev, ...res]);
      setHasMore(res.length === PAGE_SIZE);
    }
    if (error) console.error(error);
    setLoadingMore(false);
  }, [loadingMore, hasMore, data.length, buildQuery]);

  useEffect(() => {
    fetchFaltantes();
  }, [fetchFaltantes]);

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      const direction: "asc" | "desc" =
        prev?.key === key && prev.direction === "asc" ? "desc" : "asc";
      return { key, direction };
    });
  }, []);

  const toggleNameHighlight = useCallback((name: string) => {
    setCheckedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      sessionStorage.setItem("sjg_checked_names", JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFechaDesde(new Date().toISOString().split("T")[0]);
    setFechaHasta("");
    setSearchQuery("");
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(
      (f) =>
        f.nombre_apellido.toLowerCase().includes(q) ||
        f.contrato.toLowerCase().includes(q) ||
        (f.sector && f.sector.toLowerCase().includes(q)) ||
        (f.motivo && f.motivo.toLowerCase().includes(q))
    );
  }, [data, searchQuery]);

  const updateFechaDesde = useCallback((val: string) => {
    setFechaDesde(val);
    if (val) sessionStorage.setItem("sjg_working_date", val);
  }, []);

  const updateFechaHasta = useCallback((val: string) => {
    setFechaHasta(val);
    if (val) sessionStorage.setItem("sjg_fecha_hasta", val);
    else sessionStorage.removeItem("sjg_fecha_hasta");
  }, []);

  return {
    data,
    filtered,
    loading,
    loadingMore,
    hasMore,
    sortConfig,
    fechaDesde,
    fechaHasta,
    searchQuery,
    checkedNames,
    handleSort,
    toggleNameHighlight,
    resetFilters,
    loadMore,
    refetch: fetchFaltantes,
    setSearchQuery,
    updateFechaDesde,
    updateFechaHasta,
  };
}
