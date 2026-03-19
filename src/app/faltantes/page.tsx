"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search, Trash2, Loader2, UserPlus, ArrowUpDown, ArrowUp, ArrowDown,
  Calendar, Building2, FileText, FilterX, Download,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useFaltantes } from "./useFaltantes";
import { Modal } from "@/components/Modal";

export default function FaltantesDashboard() {
  const {
    filtered, loading, loadingMore, hasMore, sortConfig,
    fechaDesde, fechaHasta, searchQuery, checkedNames,
    handleSort, toggleNameHighlight, resetFilters, loadMore,
    refetch, setSearchQuery, updateFechaDesde, updateFechaHasta,
  } = useFaltantes();

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        ...(fechaDesde && { fechaDesde }),
        ...(fechaHasta && { fechaHasta }),
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
      });
      const res = await fetch(`/api/exportar-faltantes?${params}`);
      if (!res.ok) { toast.error("No hay datos o hubo un error al exportar."); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `faltantes_${fechaDesde || "general"}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { toast.error("Ocurrió un error al descargar el archivo."); }
  }, [fechaDesde, fechaHasta, searchQuery]);

  const confirmDelete = useCallback(async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    const { error } = await supabase.from("faltantes").delete().eq("id", deletingId);
    if (error) { toast.error("Error al eliminar."); }
    else { toast.success("Eliminado correctamente."); refetch(); }
    setDeleteLoading(false);
    setDeletingId(null);
  }, [deletingId, refetch]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Gestión de Faltantes</h1>
          <p className="text-sm text-muted mt-0.5">Control independiente de personal faltante en registros.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Exportar</span>
          </button>
          <Link
            href="/faltantes/carga"
            className="flex items-center gap-2 bg-accent-gold hover:bg-accent-gold-dark text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Registrar Faltante
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Fecha Desde
            </label>
            <input type="date" value={fechaDesde} onChange={(e) => updateFechaDesde(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Fecha Hasta <span className="opacity-50 normal-case font-normal">(Opcional)</span>
            </label>
            <input type="date" value={fechaHasta} onChange={(e) => updateFechaHasta(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Buscar
            </label>
            <div className="relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Nombre, sector..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all" />
              <button onClick={resetFilters} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground transition-colors rounded" title="Limpiar filtros">
                <FilterX className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
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
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin text-accent-gold mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-muted">Sin registros en este rango</td></tr>
              ) : filtered.map((f) => (
                <tr key={f.id} className="hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors group">
                  <td className="px-5 py-3.5 font-medium whitespace-nowrap">{format(new Date(f.fecha), "dd MMM yyyy", { locale: es })}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-[11px] font-medium px-2 py-1 bg-background border border-border text-muted rounded-md">{f.contrato}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div onClick={() => toggleNameHighlight(f.nombre_apellido)}
                      className={`font-medium cursor-pointer transition-all ${checkedNames.has(f.nombre_apellido) ? "text-emerald-600 dark:text-emerald-400" : "text-foreground hover:text-accent-gold"}`}>
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
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => setDeletingId(f.id)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-md text-muted hover:text-red-500 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted">No hay registros</div>
          ) : filtered.map((f) => (
            <div key={f.id} className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted">{format(new Date(f.fecha), "dd MMM yyyy", { locale: es })}</p>
                  <h4 onClick={() => toggleNameHighlight(f.nombre_apellido)}
                    className={`font-medium text-sm cursor-pointer mt-0.5 ${checkedNames.has(f.nombre_apellido) ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                    {f.nombre_apellido}
                  </h4>
                  <p className="text-xs text-muted mt-0.5">{f.contrato}</p>
                </div>
                <button onClick={() => setDeletingId(f.id)} className="p-2 border border-border rounded-lg text-muted hover:text-red-500 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {(f.sector || f.motivo) && (
                <div className="flex gap-3 text-xs text-muted">
                  {f.sector && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{f.sector}</span>}
                  {f.motivo && <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{f.motivo}</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        {!loading && hasMore && (
          <div className="border-t border-border py-4 flex justify-center">
            <button onClick={loadMore} disabled={loadingMore}
              className="flex items-center gap-2 px-5 py-2 rounded-lg border border-border text-sm font-medium text-muted hover:text-foreground transition-all disabled:opacity-50">
              {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {loadingMore ? "Cargando..." : "Cargar más"}
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="¿Eliminar registro?"
        description="Esta acción no se puede deshacer."
        type="danger"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
