"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Trash2,
  Loader2,
  UserPlus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Building2,
  FileText,
  AlertCircle,
  FilterX,
  ChevronDown,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useFaltantes } from "./useFaltantes";

export default function FaltantesDashboard() {
  const {
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
    refetch,
    setSearchQuery,
    updateFechaDesde,
    updateFechaHasta,
  } = useFaltantes();

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDownload = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        ...(fechaDesde && { fechaDesde }),
        ...(fechaHasta && { fechaHasta }),
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
      });
      const res = await fetch(`/api/exportar-faltantes?${params}`);
      if (!res.ok) {
        toast.error("No hay datos o hubo un error al exportar.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `faltantes_${fechaDesde || "general"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Ocurrió un error al descargar el archivo.");
    }
  }, [fechaDesde, fechaHasta, searchQuery]);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm("¿Está seguro de eliminar este registro?")) return;
      setDeletingId(id);
      const { error } = await supabase.from("faltantes").delete().eq("id", id);
      if (error) {
        toast.error("Error al eliminar.");
      } else {
        toast.success("Eliminado correctamente.");
        refetch();
      }
      setDeletingId(null);
    },
    [refetch]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-accent-gold rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">
              Gestión de Faltantes
            </h1>
            <p className="text-slate-600 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
              Control independiente de personal faltante en registros.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-card/20 px-4 py-2.5 border border-border text-xs font-bold text-slate-500 hover:bg-card/40 hover:text-accent-gold transition-all shadow-xl active:scale-95 disabled:opacity-50"
            title="Descargar Excel con filtros actuales"
          >
            <Download className="w-4 h-4" />
          </button>
          <Link
            href="/faltantes/carga"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-accent-gold to-accent-gold-dark px-5 py-2.5 rounded-2xl text-[10px] font-black text-black uppercase tracking-widest shadow-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Registrar Faltante
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card/40 p-6 rounded-[2.5rem] border border-border shadow-2xl space-y-4 backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
              <Calendar className="w-3 h-3 group-hover:text-accent-gold transition-colors" />
              Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => updateFechaDesde(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs font-medium text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
              <Calendar className="w-3 h-3 group-hover:text-accent-gold transition-colors" />
              Fecha Hasta{" "}
              <span className="text-[8px] opacity-40 font-bold">(Opcional)</span>
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => updateFechaHasta(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs font-medium text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
              <Search className="w-3 h-3 group-hover:text-accent-gold transition-colors" />
              Buscar
            </label>
            <div className="relative group/input">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre, contrato..."
                className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs font-medium text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all"
              />
              <button
                onClick={resetFilters}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-accent-gold transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                title="Limpiar filtros"
              >
                <FilterX className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card/40 rounded-[2rem] border border-border shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-600 dark:text-slate-500 uppercase bg-background/60 border-b border-border tracking-[0.2em] font-black">
              <tr>
                <th className="px-6 py-4">
                  <button
                    onClick={() => handleSort("fecha")}
                    className="flex items-center gap-1.5 hover:text-accent-gold transition-colors"
                  >
                    Fecha
                    {sortConfig?.key === "fecha" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4">Contrato</th>
                <th className="px-6 py-4">
                  <button
                    onClick={() => handleSort("nombre_apellido")}
                    className="flex items-center gap-1.5 hover:text-accent-gold transition-colors"
                  >
                    Empleado
                    {sortConfig?.key === "nombre_apellido" ? (
                      sortConfig.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4">Sector</th>
                <th className="px-6 py-4">Motivo</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-600 dark:text-slate-500">
                      <Loader2 className="w-8 h-8 animate-spin text-accent-gold" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Cargando registros...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-background border border-border p-5 rounded-full shadow-inner">
                        <AlertCircle className="w-10 h-10 text-slate-600" />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                        Sin faltantes en este periodo
                      </p>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                        Pruebe ajustando el rango de fechas...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr
                    key={f.id}
                    className="hover:bg-black/5 dark:hover:bg-white/5 transition-all group border-b border-border last:border-0"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-accent-gold/5 text-accent-gold/70 rounded-2xl group-hover:bg-accent-gold group-hover:text-black transition-all duration-300 shadow-inner group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="font-bold text-foreground text-sm">
                          {format(new Date(f.fecha), "dd MMM yyyy", { locale: es })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="font-black text-[10px] tracking-widest px-2.5 py-1.5 bg-background text-slate-400 rounded-xl border border-border uppercase shadow-inner group-hover:border-accent-gold/20 transition-colors">
                        {f.contrato}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div
                        onClick={() => toggleNameHighlight(f.nombre_apellido)}
                        className={`font-bold text-sm cursor-pointer transition-all ${
                          checkedNames.has(f.nombre_apellido)
                            ? "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/20 shadow-lg scale-[1.02]"
                            : "text-foreground hover:text-accent-gold"
                        }`}
                        title="Click para marcar progreso"
                      >
                        {f.nombre_apellido}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5 text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-slate-600" />
                        <span className="font-bold text-[11px] uppercase tracking-tight">
                          {f.sector || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5 text-slate-400">
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <span className="font-bold text-[11px] uppercase tracking-tight">
                          {f.motivo || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => handleDelete(f.id)}
                        disabled={deletingId === f.id}
                        className="p-2.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90 group/btn"
                      >
                        {deletingId === f.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-accent-gold" />
                        ) : (
                          <Trash2 className="w-4 h-4 group-hover/btn:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && hasMore && filtered.length > 0 && !searchQuery.trim() && (
          <div className="border-t border-border py-6 flex justify-center bg-black/5 dark:bg-white/5">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl border border-border bg-background text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:bg-card hover:text-accent-gold transition-all disabled:opacity-50 active:scale-95 shadow-xl"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {loadingMore ? "Cargando…" : "Cargar más registros"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
