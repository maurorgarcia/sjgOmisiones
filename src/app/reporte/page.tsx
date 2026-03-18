"use client";

import { useMemo, memo } from "react";
import {
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingDown,
  CheckCheck,
  Loader2,
  Search,
  Building2,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { MOTIVO_COLORS } from "@/types";
import { StatsCharts as StatsChartsBase } from "@/components/StatsCharts";
const StatsCharts = memo(StatsChartsBase);
import { Skeleton } from "@/components/Skeleton";
import { useState, useCallback } from "react";
import { useErrores } from "../useErrores";

function getMotivoBadge(motivo: string) {
  const classes =
    MOTIVO_COLORS[motivo] ?? "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${classes} shadow-sm`}
    >
      {motivo}
    </span>
  );
}

export default function ReportePage() {
  const {
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
    handleSort,
    loadMore,
  } = useErrores({ defaultFiltro: "todos", persistFilters: true });

  const [searchQuery, setSearchQuery] = useState("");
  const [checkedNames, setCheckedNames] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = sessionStorage.getItem("sjg_checked_names");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const filteredErrores = useMemo(() => {
    if (!searchQuery.trim()) return errores;
    const q = searchQuery.trim().toLowerCase();
    return errores.filter(
      (e) =>
        e.nombre_apellido.toLowerCase().includes(q) ||
        e.legajo.includes(searchQuery.trim()) ||
        (e.ot && e.ot.includes(searchQuery.trim()))
    );
  }, [errores, searchQuery]);

  const toggleNameHighlight = useCallback((name: string) => {
    setCheckedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      sessionStorage.setItem("sjg_checked_names", JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const stats = useMemo(() => {
    const total = filteredErrores.length;
    const pendientes = filteredErrores.filter((e) => !e.resuelto).length;
    const resueltos = total - pendientes;
    const pct = total > 0 ? Math.round((resueltos / total) * 100) : 0;
    return { total, pendientes, resueltos, pct };
  }, [filteredErrores]);

  const dateLabel = useMemo(() => {
    if (!fechaFiltro) return "Todos los registros";
    return fechaHasta
      ? `${format(new Date(fechaFiltro + "T12:00:00"), "d/M/yyyy", { locale: es })} – ${format(new Date(fechaHasta + "T12:00:00"), "d/M/yyyy", { locale: es })}`
      : format(new Date(fechaFiltro + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es });
  }, [fechaFiltro, fechaHasta]);

  const handleDownload = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        filter: filtro,
        motivo: filtroMotivo,
        ...(fechaFiltro && { fecha: fechaFiltro }),
        ...(fechaHasta && { fechaHasta }),
        ...(filtroSector.trim() && { sector: filtroSector.trim() }),
      });
      const res = await fetch(`/api/exportar?${params}`);
      if (!res.ok) {
        toast.error("No hay datos o hubo un error al exportar.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("content-disposition");
      a.download = cd?.includes("filename=")
        ? cd.split("filename=")[1].replace(/"/g, "")
        : `omisiones_${filtro}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Excel generado correctamente.");
    } catch {
      toast.error("Ocurrió un error al descargar el archivo.");
    }
  }, [filtro, filtroMotivo, fechaFiltro, fechaHasta, filtroSector]);

  const handleDownloadIncompletos = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        subgroup: "omisiones_fichadas",
        ...(fechaFiltro && { fecha: fechaFiltro }),
        ...(fechaHasta && { fechaHasta }),
      });
      const res = await fetch(`/api/exportar?${params}`);
      if (!res.ok) {
        toast.error("No hay registros de Omisiones/Fichadas en este periodo.");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Omisiones_y_Fichadas_${fechaFiltro || 'Historico'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Excel de Omisiones/Fichadas generado.");
    } catch {
      toast.error("Error al descargar omisiones.");
    }
  }, [fechaFiltro, fechaHasta]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-accent-gold rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">
              Reporte de Errores
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
              {dateLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadIncompletos}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-orange-600 hover:bg-orange-500/20 transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4" />
            Omisiones / Fichadas
          </button>
          
          <button
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-accent-gold transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            Todo (Excel)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card/40 rounded-2xl p-4 border border-border shadow-2xl group hover:border-accent-gold/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-accent-gold/5 p-2 rounded-xl group-hover:bg-accent-gold/10 transition-colors">
              <AlertTriangle className="w-5 h-5 text-accent-gold/70" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</p>
              <p className="text-2xl font-black text-foreground">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/40 rounded-2xl p-4 border border-accent-gold/10 shadow-2xl group hover:border-accent-gold/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-accent-gold/5 p-2 rounded-xl group-hover:bg-accent-gold/10 transition-colors">
              <Clock className="w-5 h-5 text-accent-gold" />
            </div>
            <div>
              <p className="text-[10px] font-black text-accent-gold uppercase tracking-widest">Pendientes</p>
              <p className="text-2xl font-black text-foreground">{stats.pendientes}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/40 rounded-2xl p-4 border border-emerald-500/10 shadow-2xl group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/5 p-2 rounded-xl group-hover:bg-emerald-500/10 transition-colors">
              <CheckCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Resueltos</p>
              <p className="text-2xl font-black text-foreground">{stats.resueltos}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/40 rounded-2xl p-4 border border-border shadow-2xl group hover:border-accent-gold/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-background border border-border p-2 rounded-xl group-hover:bg-card transition-colors shadow-inner">
              <TrendingDown className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resolución</p>
              <p className="text-2xl font-black text-foreground">{stats.pct}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
        </div>
      ) : (
        errores.length > 0 && <StatsCharts data={errores} />
      )}

      {/* Filters */}
      <div className="bg-card px-4 py-3 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Filtros de motives y fechas */}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <select
            value={filtroMotivo}
            onChange={(e) => setFiltroMotivo(e.target.value)}
            className="px-4 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500 focus:ring-2 focus:ring-accent-gold/50 outline-none transition bg-background hover:bg-card cursor-pointer shadow-inner appearance-none"
          >
            <option value="todos" className="bg-card font-black uppercase">
              Todos los motivos
            </option>
            {Object.keys(MOTIVO_COLORS).map((m) => (
              <option key={m} value={m} className="bg-card font-black uppercase">
                {m}
              </option>
            ))}
          </select>

          <div className="relative flex-grow sm:flex-grow-0 min-w-[140px]">
            <Building2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filtroSector}
              onChange={(e) => setFiltroSector(e.target.value)}
              placeholder="Sector..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border text-xs font-black uppercase tracking-widest text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 dark:placeholder:opacity-50 focus:ring-2 focus:ring-accent-gold/50 outline-none transition bg-background hover:bg-card shadow-inner"
            />
          </div>

          <div className="relative flex-grow sm:flex-grow-0">
            <Calendar className="w-3.5 h-3.5 text-slate-600 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="w-full sm:w-auto pl-9 pr-4 py-2 rounded-xl border border-border text-xs font-medium text-foreground focus:ring-2 focus:ring-accent-gold/50 outline-none transition bg-background hover:bg-card shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-grow sm:flex-grow-0">
            <span className="text-xs text-slate-600 dark:text-slate-500 hidden sm:inline">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full sm:w-auto pl-4 py-2 rounded-xl border border-border text-xs font-medium text-foreground focus:ring-2 focus:ring-accent-gold/50 outline-none transition bg-background hover:bg-card shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
              title="Hasta (opcional, para rango)"
            />
          </div>
          <button
            onClick={() => {
              setFechaFiltro("");
              setFechaHasta("");
              setFiltro("todos");
            }}
            className="text-[10px] text-accent-gold hover:text-accent-gold-dark font-black uppercase tracking-widest whitespace-nowrap px-4 py-2 rounded-xl border border-accent-gold/10 hover:bg-accent-gold/5 transition-all shadow-inner active:scale-95"
          >
            Ver Histórico
          </button>
        </div>
      </div>

      {/* Search */}
      {!loading && errores.length > 0 && (
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-600 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, legajo o OT..."
            className="flex-1 max-w-xs border border-border rounded-xl pl-4 py-2 text-xs font-medium text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 dark:placeholder:opacity-50 focus:ring-2 focus:ring-accent-gold/50 outline-none transition bg-background hover:bg-card shadow-inner"
          />
          {searchQuery.trim() && (
            <span className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest">
              Mostrando {filteredErrores.length} de {errores.length}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-card/40 rounded-2xl border border-border shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-600 dark:text-slate-500 uppercase bg-background/60 border-b border-border tracking-[0.2em] font-black">
              <tr>
                <th className="px-5 py-3.5">
                  <button
                    onClick={() => handleSort("resuelto")}
                    className="flex items-center gap-1 hover:text-accent-gold transition-colors"
                  >
                    Estado
                    {sortConfig?.key === "resuelto" ? (
                      sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <button
                    onClick={() => handleSort("fecha")}
                    className="flex items-center gap-1 hover:text-accent-gold transition-colors"
                  >
                    Fecha
                    {sortConfig?.key === "fecha" ? (
                      sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <button
                    onClick={() => handleSort("nombre_apellido")}
                    className="flex items-center gap-1 hover:text-accent-gold transition-colors"
                  >
                    Empleado
                    {sortConfig?.key === "nombre_apellido" ? (
                      sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <button
                    onClick={() => handleSort("motivo_error")}
                    className="flex items-center gap-1 hover:text-accent-gold transition-colors"
                  >
                    Motivo
                    {sortConfig?.key === "motivo_error" ? (
                      sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
                <th className="px-5 py-3.5 font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">
                  OT / Sector
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-500">
                      <Loader2 className="w-8 h-8 animate-spin text-accent-gold" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Cargando datos maestros...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredErrores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-background border border-border p-4 rounded-full shadow-inner">
                        <CheckCheck className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="font-black uppercase text-[11px] tracking-widest text-slate-500 mt-1">
                        {errores.length === 0 ? "No hay errores para mostrar" : "Ningún registro coincide"}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-tight text-slate-400 opacity-60">
                        {errores.length === 0
                          ? filtro === "pendientes"
                            ? "¡Todo al día! No hay nada pendiente."
                            : "No se encontraron registros con este filtro."
                          : `Hay ${errores.length} registro(s). Probá otro término.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredErrores.map((err) => (
                  <tr
                    key={err.id}
                    className={`hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-border last:border-0 ${err.resuelto ? "opacity-40 grayscale-[0.5]" : ""}`}
                  >
                    <td className="px-5 py-4">
                      {err.resuelto ? (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resuelto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-accent-gold/10 text-accent-gold border border-accent-gold/20 shadow-[0_0_12px_rgba(245,158,11,0.1)]">
                          <Clock className="w-3.5 h-3.5" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-foreground text-sm">
                        {format(new Date(err.fecha), "dd MMM yyyy", { locale: es })}
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {err.dia_semana}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div
                        onClick={() => toggleNameHighlight(err.nombre_apellido)}
                        className={`font-bold text-sm cursor-pointer transition-all ${
                          checkedNames.has(err.nombre_apellido)
                            ? "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/20 shadow-lg scale-[1.02]"
                            : "text-foreground hover:text-accent-gold"
                        }`}
                        title="Click para marcar progreso"
                      >
                        {err.nombre_apellido}
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                        Leg: {err.legajo}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {getMotivoBadge(err.motivo_error)}
                      {err.notas && (
                        <div
                          className="text-[10px] font-bold text-slate-500 mt-1.5 max-w-[200px] truncate italic uppercase tracking-tight"
                          title={err.notas}
                        >
                          &quot;{err.notas}&quot;
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-foreground text-xs uppercase tracking-tight">
                        {err.sector}
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                        {err.ot ? `OT: ${err.ot}` : "Sin OT"}
                        {err.horario ? ` · ${err.horario}` : ""}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && hasMore && errores.length > 0 && !searchQuery.trim() && (
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
