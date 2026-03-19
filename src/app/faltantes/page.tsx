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
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useFaltantes } from "./useFaltantes";
import { Modal } from "@/components/Modal";

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

  // ✅ FIX: reemplazado confirm() nativo con Modal component
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
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Ocurrió un error al descargar el archivo.");
    }
  }, [fechaDesde, fechaHasta, searchQuery]);

  const confirmDelete = useCallback(async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    const { error } = await supabase.from("faltantes").delete().eq("id", deletingId);
    if (error) {
      toast.error("Error al eliminar.");
    } else {
      toast.success("Eliminado correctamente.");
      refetch();
    }
    setDeleteLoading(false);
    setDeletingId(null);
  }, [deletingId, refetch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-accent-gold rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">Gestión de Faltantes</h1>
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
              <Calendar className="w-3 h-3 group-hover:text-accent-gold transition-colors" /> Fecha Desde
            </label>
            <input type="date" value={fechaDesde} onChange={(e) => updateFechaDesde(e.target.value)} className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs font-medium text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
              <Calendar className="w-3 h-3 group-hover:text-accent-gold transition-colors" /> Fecha Hasta <span className="text-[8px] opacity-40 font-bold">(Opcional)</span>
            </label>
            <input type="date" value={fechaHasta} onChange={(e) => updateFechaHasta(e.target.value)} className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs font-medium text-foreground focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
              <Search className="w-3 h-3 group-hover:text-accent-gold transition-colors" /> Buscar
            </label>
            <div className="relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Nombre, sector..." className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-xs font-medium text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition-all shadow-inner" />
              <button onClick={resetFilters} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-accent-gold transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5" title="Limpiar filtros">
                <FilterX className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card/40 rounded-[2rem] border border-border shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase bg-background/60 border-b border-border tracking-[0.2em] font-black">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Contrato</th>
                <th className="px-6 py-4 whitespace-nowrap">
                  <button onClick={() => handleSort("nombre_apellido")} className="flex items-center gap-1.5 hover:text-accent-gold transition-colors">
                    Empleado
                    {sortConfig?.key === "nombre_apellido"
                      ? sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-6 py-4">Sector</th>
                <th className="px-6 py-4">Motivo</th>
                <th className="px-6 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin text-accent-gold mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center text-[10px] font-black uppercase tracking-widest opacity-40">Sin registros en este rango</td></tr>
              ) : filtered.map((f) => (
                <tr key={f.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-all group">
                  <td className="px-6 py-4 font-bold text-sm whitespace-nowrap">
                    {format(new Date(f.fecha), "dd MMM yyyy", { locale: es })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-black text-[10px] tracking-widest px-2.5 py-1.5 bg-background border border-border text-slate-500 rounded-xl uppercase">{f.contrato}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      onClick={() => toggleNameHighlight(f.nombre_apellido)}
                      className={`font-bold text-sm cursor-pointer transition-all ${checkedNames.has(f.nombre_apellido) ? "text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 inline-block" : "text-foreground hover:text-accent-gold"}`}
                    >
                      {f.nombre_apellido}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Building2 className="w-3.5 h-3.5 opacity-50" />
                      <span className="font-black text-[11px] uppercase tracking-tight">{f.sector || "—"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-500">
                      <FileText className="w-3.5 h-3.5 opacity-50" />
                      <span className="font-black text-[11px] uppercase tracking-tight">{f.motivo || "—"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setDeletingId(f.id)}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
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
            <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-accent-gold mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-20 text-center uppercase text-[10px] font-black tracking-widest opacity-40">No hay registros</div>
          ) : filtered.map((f) => (
            <div key={f.id} className="p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] opacity-50 font-black">{format(new Date(f.fecha), "dd MMM yyyy", { locale: es })}</p>
                  <h4
                    onClick={() => toggleNameHighlight(f.nombre_apellido)}
                    className={`font-black text-sm uppercase tracking-tight cursor-pointer ${checkedNames.has(f.nombre_apellido) ? "text-emerald-500" : "text-foreground"}`}
                  >
                    {f.nombre_apellido}
                  </h4>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{f.contrato}</p>
                </div>
                <button onClick={() => setDeletingId(f.id)} className="p-2.5 bg-background border border-border rounded-xl text-slate-500 hover:text-red-500 shadow-sm active:scale-95">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                {f.sector && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{f.sector}</span>}
                {f.motivo && <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{f.motivo}</span>}
              </div>
            </div>
          ))}
        </div>

        {!loading && hasMore && (
          <div className="border-t border-border py-5 flex justify-center bg-black/5 dark:bg-white/5">
            <button onClick={loadMore} disabled={loadingMore} className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl border border-border bg-background text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-accent-gold transition-all disabled:opacity-50">
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loadingMore ? "Cargando..." : "Cargar más"}
            </button>
          </div>
        )}
      </div>

      {/* ✅ FIX: Modal de confirmación de eliminación en lugar de confirm() nativo */}
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
