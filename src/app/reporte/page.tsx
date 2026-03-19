"use client";

import { useMemo, memo, useState, useCallback, useEffect } from "react";
import {
  ExternalLink, Calendar, CheckCircle2, Clock, AlertTriangle, TrendingDown,
  CheckCheck, Loader2, Search, Building2, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { MOTIVO_COLORS } from "@/types";
import { StatsCharts as StatsChartsBase } from "@/components/StatsCharts";
const StatsCharts = memo(StatsChartsBase);
import { Skeleton } from "@/components/Skeleton";
import { useErrores } from "../useErrores";

function getMotivoBadge(motivo: string) {
  const classes = MOTIVO_COLORS[motivo] ?? "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border ${classes}`}>
      {motivo}
    </span>
  );
}

export default function ReportePage() {
  const {
    errores, loading, loadingMore, hasMore, filtro, filtroMotivo, filtroSector,
    fechaFiltro, fechaHasta, sortConfig, setFiltro, setFiltroMotivo, setFiltroSector,
    setFechaFiltro, setFechaHasta, search, setSearch, handleSort, loadMore,
  } = useErrores({ defaultFiltro: "todos", persistFilters: true });

  const [searchTyped, setSearchTyped] = useState("");
  const [checkedNames, setCheckedNames] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = sessionStorage.getItem("sjg_checked_names");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const filteredErrores = errores;

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchTyped); }, 400);
    return () => clearTimeout(timer);
  }, [searchTyped, setSearch]);

  const toggleNameHighlight = useCallback((name: string) => {
    setCheckedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
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
        filter: filtro, motivo: filtroMotivo,
        ...(fechaFiltro && { fecha: fechaFiltro }),
        ...(fechaHasta && { fechaHasta }),
        ...(filtroSector.trim() && { sector: filtroSector.trim() }),
      });
      const res = await fetch(`/api/exportar?${params}`);
      if (!res.ok) { toast.error("No hay datos o hubo un error al exportar."); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("content-disposition");
      a.download = cd?.includes("filename=") ? cd.split("filename=")[1].replace(/"/g, "") : `omisiones_${filtro}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Excel generado correctamente.");
    } catch { toast.error("Ocurrió un error al descargar el archivo."); }
  }, [filtro, filtroMotivo, fechaFiltro, fechaHasta, filtroSector]);

  const handleDownloadIncompletos = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        subgroup: "omisiones_fichadas",
        ...(fechaFiltro && { fecha: fechaFiltro }),
        ...(fechaHasta && { fechaHasta }),
      });
      const res = await fetch(`/api/exportar?${params}`);
      if (!res.ok) { toast.error("No hay registros de Omisiones/Fichadas en este periodo."); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Omisiones_y_Fichadas_${fechaFiltro || "Historico"}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Excel de Omisiones/Fichadas generado.");
    } catch { toast.error("Error al descargar omisiones."); }
  }, [fechaFiltro, fechaHasta]);

  // Descarga todos los motivos excepto "Saldo hrs insuficiente" y "Otro"
  // (salvo que "Otro" comparta legajo+día con un motivo de omisión/OT/fichada)
  const handleDownloadReporte = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        filter: filtro,
        subgroup: "sin_otros_saldo",
        ...(fechaFiltro && { fecha: fechaFiltro }),
        ...(fechaHasta && { fechaHasta }),
        ...(filtroSector.trim() && { sector: filtroSector.trim() }),
      });
      const res = await fetch(`/api/exportar?${params}`);
      if (!res.ok) { toast.error("No hay datos para exportar con estos filtros."); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("content-disposition");
      a.download = cd?.includes("filename=") ? cd.split("filename=")[1].replace(/"/g, "") : `Omisiones_Reporte.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Reporte generado (sin Saldo / Otro no relacionado).");
    } catch { toast.error("Ocurrió un error al descargar el reporte."); }
  }, [filtro, fechaFiltro, fechaHasta, filtroSector]);

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Reporte de Errores</h1>
          <p className="text-sm text-muted mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadIncompletos}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
            title="Solo Omisión, Par de fichada incompleto y OT Inexistente"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Omisiones / Fichadas
          </button>
          <button
            onClick={handleDownloadReporte}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-gold hover:bg-accent-gold-dark text-white font-semibold text-sm transition-colors disabled:opacity-50 shadow-sm"
            title="Excluye 'Saldo hrs insuficiente' y 'Otro' (salvo que el Otro esté vinculado a una omisión/OT)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="text-xs">Reporte</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50"
            title="Exporta todo sin filtro de motivo"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="text-xs">Todo</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-1">Total</p>
          <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] font-medium text-accent-gold uppercase tracking-wide mb-1">Pendientes</p>
          <p className="text-2xl font-semibold text-foreground">{stats.pendientes}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Resueltos</p>
          <p className="text-2xl font-semibold text-foreground">{stats.resueltos}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[11px] font-medium text-muted uppercase tracking-wide mb-1">Resolución</p>
          <p className="text-2xl font-semibold text-foreground">{stats.pct}%</p>
        </div>
      </div>

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
        </div>
      ) : (
        errores.length > 0 && <StatsCharts data={errores} />
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <select
            value={filtroMotivo}
            onChange={(e) => setFiltroMotivo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition bg-background cursor-pointer appearance-none"
          >
            <option value="todos">Todos los motivos</option>
            {Object.keys(MOTIVO_COLORS).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <div className="relative min-w-[140px]">
            <Building2 className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filtroSector}
              onChange={(e) => setFiltroSector(e.target.value)}
              placeholder="Sector..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground placeholder:text-muted focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition bg-background"
            />
          </div>

          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="w-full sm:w-auto pl-9 pr-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition bg-background [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted hidden sm:inline">–</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition bg-background [color-scheme:light] dark:[color-scheme:dark]"
              title="Hasta (opcional)"
            />
          </div>
          <button
            onClick={() => { setFechaFiltro(""); setFechaHasta(""); setFiltro("todos"); }}
            className="text-xs font-medium text-accent-gold hover:text-accent-gold-dark transition-colors px-3 py-2 rounded-lg border border-border hover:bg-accent-gold/5"
          >
            Ver Histórico
          </button>
        </div>
      </div>

      {/* Search */}
      {!loading && errores.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTyped}
              onChange={(e) => setSearchTyped(e.target.value)}
              placeholder="Buscar por nombre, legajo o OT..."
              className="w-full pl-9 pr-3 border border-border rounded-lg py-2 text-xs font-medium text-foreground placeholder:text-muted focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition bg-background"
            />
          </div>
          {searchTyped.trim() && (
            <span className="text-xs text-muted">
              {loading ? "Buscando..." : `${errores.length} resultado(s)`}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-medium text-muted uppercase tracking-wide bg-background border-b border-border">
              <tr>
                <th className="px-5 py-3.5">
                  <button onClick={() => handleSort("resuelto")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Estado
                    {sortConfig?.key === "resuelto" ? (sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <button onClick={() => handleSort("fecha")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Fecha
                    {sortConfig?.key === "fecha" ? (sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <button onClick={() => handleSort("nombre_apellido")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Empleado
                    {sortConfig?.key === "nombre_apellido" ? (sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <button onClick={() => handleSort("motivo_error")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Motivo
                    {sortConfig?.key === "motivo_error" ? (sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5">OT / Sector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-accent-gold mx-auto" />
                  </td>
                </tr>
              ) : filteredErrores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <CheckCheck className="w-6 h-6 text-muted mx-auto mb-2" />
                    <p className="text-sm text-muted">
                      {errores.length === 0 ? "No hay errores para mostrar" : "Ningún registro coincide"}
                    </p>
                  </td>
                </tr>
              ) : filteredErrores.map((err) => (
                <tr key={err.id} className={`hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors ${err.resuelto ? "opacity-60" : ""}`}>
                  <td className="px-5 py-3.5">
                    {err.resuelto ? (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Resuelto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-medium bg-accent-gold/10 text-accent-gold border border-accent-gold/20">
                        <Clock className="w-3 h-3" /> Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="font-medium text-foreground">{format(new Date(err.fecha), "dd MMM yyyy", { locale: es })}</div>
                    <div className="text-xs text-muted mt-0.5">{err.dia_semana}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div onClick={() => toggleNameHighlight(err.nombre_apellido)}
                      className={`font-medium cursor-pointer transition-all ${checkedNames.has(err.nombre_apellido) ? "text-emerald-600 dark:text-emerald-400" : "text-foreground hover:text-accent-gold"}`}
                      title="Click para marcar progreso">
                      {err.nombre_apellido}
                    </div>
                    <div className="text-xs text-muted mt-0.5">Leg: {err.legajo}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    {getMotivoBadge(err.motivo_error)}
                    {err.notas && (
                      <div className="text-xs text-muted mt-1.5 max-w-[200px] truncate italic" title={err.notas}>
                        &quot;{err.notas}&quot;
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-foreground text-xs">{err.sector}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {err.ot ? `OT: ${err.ot}` : "Sin OT"}
                      {err.horario ? ` · ${err.horario}` : ""}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-border">
          {loading ? (
            <div className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-accent-gold mx-auto" /></div>
          ) : filteredErrores.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted">No hay registros</div>
          ) : filteredErrores.map((err) => (
            <div key={err.id} className={`p-4 space-y-3 ${err.resuelto ? "opacity-60" : ""}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted">{format(new Date(err.fecha), "dd MMM yyyy", { locale: es })}</p>
                  <h4 className={`font-medium text-sm mt-0.5 cursor-pointer ${checkedNames.has(err.nombre_apellido) ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
                    onClick={() => toggleNameHighlight(err.nombre_apellido)}>
                    {err.nombre_apellido}
                  </h4>
                  <p className="text-xs text-muted mt-0.5">Leg: {err.legajo}</p>
                </div>
                {err.resuelto ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-accent-gold" />}
              </div>
              <div className="flex flex-wrap gap-2">
                {getMotivoBadge(err.motivo_error)}
                {err.ot && <span className="text-[10px] font-medium bg-background border border-border px-2 py-1 rounded-md text-muted">OT: {err.ot}</span>}
              </div>
              <div className="flex justify-between items-center bg-background rounded-lg p-3 border border-border">
                <div>
                  <p className="text-[10px] text-muted mb-0.5">Sector</p>
                  <p className="text-xs font-medium text-foreground">{err.sector}</p>
                </div>
                {err.horario && (
                  <div className="text-right">
                    <p className="text-[10px] text-muted mb-0.5">Horario</p>
                    <p className="text-xs font-medium text-foreground">{err.horario}</p>
                  </div>
                )}
              </div>
              {err.notas && (
                <p className="text-xs text-muted italic border-l-2 border-accent-gold/20 pl-3">&quot;{err.notas}&quot;</p>
              )}
            </div>
          ))}
        </div>

        {!loading && hasMore && errores.length > 0 && !searchTyped.trim() && (
          <div className="border-t border-border py-4 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-5 py-2 rounded-lg border border-border text-sm font-medium text-muted hover:text-foreground transition-all disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {loadingMore ? "Cargando…" : "Cargar más registros"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
