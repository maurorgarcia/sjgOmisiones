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

  const handleExport = async () => {
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
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Reporte de Faltantes</h1>
          <p className="text-sm text-muted mt-0.5">Listado histórico de personal sin registros cargados.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="text-xs">Exportar Excel</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => updateFechaDesde(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Fecha Hasta <span className="opacity-50 normal-case font-normal">(Opcional)</span>
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => updateFechaHasta(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Buscar
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre, contrato..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all"
              />
              <button
                onClick={resetFilters}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground transition-colors rounded"
                title="Limpiar filtros"
              >
                <FilterX className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-medium text-muted uppercase tracking-wide bg-background border-b border-border">
              <tr>
                <th className="px-5 py-3.5">Fecha</th>
                <th className="px-5 py-3.5">Contrato</th>
                <th className="px-5 py-3.5">
                  <button onClick={() => handleSort("nombre_apellido")} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    Empleado
                    {sortConfig?.key === "nombre_apellido"
                      ? sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5">Sector</th>
                <th className="px-5 py-3.5">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Loader2 className="w-5 h-5 animate-spin text-accent-gold mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-muted">Sin registros en este rango</td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors group">
                    <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                      {format(new Date(f.fecha), "dd MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-medium px-2 py-1 bg-background border border-border text-muted rounded-md">{f.contrato}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div
                        onClick={() => toggleNameHighlight(f.nombre_apellido)}
                        className={`font-medium cursor-pointer transition-all ${checkedNames.has(f.nombre_apellido) ? "text-emerald-600 dark:text-emerald-400" : "text-foreground hover:text-accent-gold"}`}
                        title="Click para marcar progreso"
                      >
                        {f.nombre_apellido}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-muted">
                        <Building2 className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                        <span className="text-xs">{f.sector || "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-muted">
                        <FileText className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                        <span className="text-xs">{f.motivo || "—"}</span>
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
