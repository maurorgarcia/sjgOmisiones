"use client";

import {
  Search,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Building2,
  FileText,
  AlertCircle,
  ExternalLink,
  FilterX,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useFaltantes } from "../useFaltantes";

export default function FaltantesReporte() {
  const {
    filtered,
    loading,
    sortConfig,
    fechaDesde,
    fechaHasta,
    searchQuery,
    checkedNames,
    handleSort,
    toggleNameHighlight,
    resetFilters,
    setSearchQuery,
    updateFechaDesde,
    updateFechaHasta,
  } = useFaltantes();

  const handleExport = () => {
    toast.info("Función de exportar para Faltantes estará disponible próximamente.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-accent-gold rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">
              Reporte de Faltantes
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
              Listado histórico de personal sin registros cargados.
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-accent-gold transition-all shadow-xl active:scale-95"
        >
          <ExternalLink className="w-4 h-4" />
          Descargar Datos
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-card/40 p-6 rounded-[2.5rem] border border-border shadow-2xl space-y-4 backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
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
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
              <Calendar className="w-3 h-3 group-hover:text-accent-gold transition-colors" />
              Fecha Hasta{" "}
              <span className="text-[8px] opacity-40 font-black tracking-tight">(OPCIONAL)</span>
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => updateFechaHasta(e.target.value)}
              className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs font-medium text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
              <Search className="w-3 h-3 group-hover:text-accent-gold transition-colors" />
              Buscar
            </label>
            <div className="relative group/input">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre, contrato..."
                className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs font-medium text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 dark:placeholder:opacity-50 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all shadow-inner"
              />
              <button
                onClick={resetFilters}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-accent-gold transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
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
            <thead className="text-[10px] text-slate-500 uppercase bg-background/60 border-b border-border tracking-[0.2em] font-black">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Contrato</th>
                <th className="px-6 py-4 whitespace-nowrap">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-500">
                      <Loader2 className="w-8 h-8 animate-spin text-accent-gold" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        Generando reporte...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-background border border-border p-5 rounded-full shadow-inner">
                        <AlertCircle className="w-10 h-10 text-slate-400 dark:text-slate-600" />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                        No hay datos en este rango
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Ajuste la búsqueda para ver resultados.
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
                      <span className="font-black text-[10px] tracking-widest px-2.5 py-1.5 bg-background border border-border text-slate-500 rounded-xl uppercase shadow-inner group-hover:border-accent-gold/20 transition-colors">
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
                      <div className="flex items-center gap-2.5 text-slate-500">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                        <span className="font-black text-[11px] uppercase tracking-tight">
                          {f.sector || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5 text-slate-500">
                        <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                        <span className="font-black text-[11px] uppercase tracking-tight">
                          {f.motivo || "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
