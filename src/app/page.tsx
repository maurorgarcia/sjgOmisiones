"use client";

import { useState, useMemo, useCallback, useEffect, memo } from "react";
import { supabase } from "@/lib/supabase";
import {
  ExternalLink,
  CheckCircle2,
  Clock,
  Send,
  CheckCheck,
  Loader2,
  Trash2,
  Pencil,
  X,
  Search,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ErrorCarga, MOTIVO_COLORS, MOTIVOS, CONTRATOS } from "@/types";
import { StatsCharts as StatsChartsBase } from "@/components/StatsCharts";
const StatsCharts = memo(StatsChartsBase);
import { Modal } from "@/components/Modal";
import { Skeleton, TableSkeleton } from "@/components/Skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { useErrores } from "./useErrores";

function getMotivoBadge(motivo: string) {
  const classes =
    MOTIVO_COLORS[motivo] ??
    "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium border ${classes}`}>
      {motivo}
    </span>
  );
}

export default function Dashboard() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

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
    search,
    sortConfig,
    setFiltro,
    setFiltroMotivo,
    setFiltroSector,
    setFechaFiltro,
    setFechaHasta,
    setSearch,
    handleSort,
    fetchErrores,
    loadMore,
  } = useErrores({ defaultFiltro: "todos", persistFilters: true });

  const [sending, setSending] = useState(false);
  const [searchTyped, setSearchTyped] = useState("");
  const [editForm, setEditForm] = useState<Partial<ErrorCarga> | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [checkedNames, setCheckedNames] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = sessionStorage.getItem("sjg_checked_names");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const filteredErrores = errores;

  // ✅ FIX: limpiar selección cuando cambian los filtros — evita eliminar registros
  // que el usuario ya no ve en pantalla
  useEffect(() => {
    setSelectedIds([]);
  }, [filtro, filtroMotivo, filtroSector, fechaFiltro, fechaHasta, search]);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchTyped); }, 400);
    return () => clearTimeout(timer);
  }, [searchTyped, setSearch]);

  const toggleNameHighlight = useCallback((name: string) => {
    setCheckedNames((prev) => {
      const newChecked = new Set(prev);
      if (newChecked.has(name)) newChecked.delete(name);
      else newChecked.add(name);
      sessionStorage.setItem("sjg_checked_names", JSON.stringify(Array.from(newChecked)));
      return newChecked;
    });
  }, []);

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredErrores.map((err) => err.id));
    else setSelectedIds([]);
  }, [filteredErrores]);

  const handleSelectOne = useCallback((id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const confirmBulkDelete = useCallback(async () => {
    await supabase.from("error_carga").delete().in("id", selectedIds);
    const count = selectedIds.length;
    setSelectedIds([]);
    setIsBulkDeleting(false);
    toast.success(`${count} registros eliminados correctamente.`);
    fetchErrores();
  }, [selectedIds, fetchErrores]);

  const handleBulkResolve = useCallback(async () => {
    await supabase.from("error_carga").update({ resuelto: true }).in("id", selectedIds);
    const count = selectedIds.length;
    setSelectedIds([]);
    toast.success(`${count} registros marcados como resueltos.`);
    fetchErrores();
  }, [selectedIds, fetchErrores]);

  const toggleResuelto = useCallback(async (id: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const label = currentStatus ? "reabierto" : "resuelto";
    const { error } = await supabase.from("error_carga").update({ resuelto: newStatus }).eq("id", id);
    if (error) { toast.error("Error al actualizar el estado."); return; }
    toast.success(`Registro ${label}.`);
    fetchErrores();
  }, [fetchErrores]);

  const openEdit = useCallback((err: ErrorCarga) => { setEditForm({ ...err }); }, []);

  const saveEdit = useCallback(async () => {
    if (!editForm || !editForm.id) return;
    setEditLoading(true);
    const { error } = await supabase.from("error_carga").update({
      fecha: editForm.fecha,
      nombre_apellido: editForm.nombre_apellido?.toUpperCase(),
      legajo: editForm.legajo,
      motivo_error: editForm.motivo_error,
      ot: editForm.ot || null,
      sector: editForm.sector,
      horario: editForm.horario || null,
      notas: editForm.notas || null,
      contrato: editForm.contrato,
      horas_normales: editForm.horas_normales,
      hs_normales_insa: editForm.hs_normales_insa,
      hs_normales_polu: editForm.hs_normales_polu,
      hs_normales_noct: editForm.hs_normales_noct,
      horas_50: editForm.horas_50,
      hs_50_insa: editForm.hs_50_insa,
      hs_50_polu: editForm.hs_50_polu,
      hs_50_noct: editForm.hs_50_noct,
      horas_100: editForm.horas_100,
      hs_100_insa: editForm.hs_100_insa,
      hs_100_polu: editForm.hs_100_polu,
      hs_100_noct: editForm.hs_100_noct,
    }).eq("id", editForm.id);
    setEditLoading(false);
    if (!error) {
      setEditForm(null);
      toast.success("Registro actualizado correctamente.");
      fetchErrores();
    } else {
      toast.error("Error al actualizar: " + error.message);
    }
  }, [editForm, fetchErrores]);

  const confirmDelete = useCallback(async (id: number) => {
    const { error } = await supabase.from("error_carga").delete().eq("id", id);
    if (!error) toast.success("Registro eliminado.");
    else toast.error("Error al eliminar.");
    setDeletingId(null);
    fetchErrores();
  }, [fetchErrores]);

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
      if (!res.ok) { toast.error("No hay datos o hubo un error al exportar."); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `omisiones_${filtro}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Ocurrió un error al descargar el archivo.");
    }
  }, [filtro, filtroMotivo, fechaFiltro, fechaHasta, filtroSector]);

  const handleSendEmail = useCallback(async () => {
    try {
      setSending(true);
      const res = await fetch("/api/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: filtro,
          filterMotivo: filtroMotivo,
          fecha: fechaFiltro,
          fechaHasta: fechaHasta || undefined,
          sector: filtroSector.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar el correo");
      toast.success("Correo enviado exitosamente.");
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  }, [filtro, filtroMotivo, fechaFiltro, fechaHasta, filtroSector]);

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
      ? `${format(new Date(fechaFiltro + "T12:00:00"), "d/M/yyyy")} – ${format(new Date(fechaHasta + "T12:00:00"), "d/M/yyyy")}`
      : format(new Date(fechaFiltro + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es });
  }, [fechaFiltro, fechaHasta]);

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Gestión de Omisiones</h1>
          <p className="text-sm text-muted mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleDownload} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50" title="Exportar Excel">
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">Exportar</span>
          </button>
          {isAdmin && (
            <>
              <Link href="/carga" className="flex items-center gap-2 bg-accent-gold hover:bg-accent-gold-dark text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm shadow-sm">Nuevo Registro</Link>
              <button onClick={handleSendEmail} disabled={sending || loading} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Enviar Reporte</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
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

      {loading ? <Skeleton className="h-[300px]" /> : errores.length > 0 && <StatsCharts data={errores} />}

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <select value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)} className="px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition bg-background cursor-pointer appearance-none">
            <option value="todos">Todos los motivos</option>
            {Object.keys(MOTIVO_COLORS).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="relative min-w-[140px]">
            <Building2 className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" value={filtroSector} onChange={(e) => setFiltroSector(e.target.value)} placeholder="Sector..." className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-xs font-medium text-foreground placeholder:text-muted focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition bg-background" />
          </div>
          <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-xs font-medium text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition bg-background [color-scheme:light] dark:[color-scheme:dark]" />
          <button onClick={() => { setFechaFiltro(""); setFechaHasta(""); setFiltro("todos"); }} className="text-xs font-medium text-accent-gold hover:text-accent-gold-dark transition-colors px-3 py-2 rounded-lg border border-border hover:bg-accent-gold/5">
            Ver Histórico
          </button>
        </div>
      </div>

      {!loading && errores.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="text" value={searchTyped} onChange={(e) => setSearchTyped(e.target.value)} placeholder="Buscar por nombre, legajo..." className="w-full pl-9 pr-3 border border-border rounded-lg py-2 text-xs font-medium text-foreground placeholder:text-muted focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition bg-background" />
          </div>
        </div>
      )}

      {/* Bulk actions bar */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/5 border border-red-500/20 rounded-xl animate-in fade-in duration-200">
          <span className="text-xs font-medium text-red-500">{selectedIds.length} seleccionados</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={handleBulkResolve} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors">
              <CheckCheck className="w-3.5 h-3.5" />
              Resolver todos
            </button>
            <button onClick={() => setIsBulkDeleting(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-500 hover:bg-red-500/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar todos
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] font-medium text-muted uppercase tracking-wide bg-background border-b border-border">
              <tr>
                {isAdmin && (
                  <th className="px-5 py-3.5 w-12 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedIds.length === filteredErrores.length && filteredErrores.length > 0}
                      className="rounded border-border text-accent-gold focus:ring-accent-gold"
                    />
                  </th>
                )}
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Fecha</th>
                <th className="px-5 py-3.5">Empleado</th>
                <th className="px-5 py-3.5">Motivo</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-12"><TableSkeleton rows={5} /></td></tr>
              ) : filteredErrores.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-sm text-muted">No se encontraron registros</td></tr>
              ) : filteredErrores.map((err) => (
                <tr key={err.id} className={`hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors group ${err.resuelto ? "opacity-60" : ""}`}>
                  {isAdmin && (
                    <td className="px-5 text-center">
                      <input type="checkbox" checked={selectedIds.includes(err.id)} onChange={() => handleSelectOne(err.id)} className="rounded border-border text-accent-gold focus:ring-accent-gold" />
                    </td>
                  )}
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-medium border ${err.resuelto ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-accent-gold/10 text-accent-gold border-accent-gold/20"}`}>
                      {err.resuelto ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {err.resuelto ? "Resuelto" : "Pendiente"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-xs whitespace-nowrap">{format(new Date(err.fecha), "dd MMM yyyy")}</td>
                  <td className="px-5 py-3.5 font-medium text-sm">{err.nombre_apellido}</td>
                  <td className="px-5 py-3.5">{getMotivoBadge(err.motivo_error)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleResuelto(err.id, err.resuelto)} className="p-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] rounded-md text-muted hover:text-accent-gold transition-all">
                        {err.resuelto ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => openEdit(err)} className="p-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] rounded-md text-muted hover:text-accent-gold transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeletingId(err.id)} className="p-1.5 hover:bg-red-500/10 rounded-md text-muted hover:text-red-500 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </>
                      )}
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
            <div className="p-10 text-center text-sm text-muted">Cargando...</div>
          ) : filteredErrores.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted">No hay registros</div>
          ) : filteredErrores.map((err) => (
            <div key={err.id} className={`p-4 space-y-3 ${err.resuelto ? "opacity-60" : ""}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted">{format(new Date(err.fecha), "dd MMM yyyy")}</p>
                  <h4 className="font-medium text-sm mt-0.5">{err.nombre_apellido}</h4>
                </div>
                <button onClick={() => toggleResuelto(err.id, err.resuelto)} className={`text-[10px] font-medium border rounded-lg px-2 py-1 ${err.resuelto ? "text-emerald-500 border-emerald-500/20" : "text-accent-gold border-accent-gold/20"}`}>
                  {err.resuelto ? "Resuelto" : "Resolver"}
                </button>
              </div>
              <div className="flex justify-between items-center">
                {getMotivoBadge(err.motivo_error)}
                {isAdmin && (
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(err)} className="p-2 border border-border rounded-lg text-muted hover:text-accent-gold transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeletingId(err.id)} className="p-2 border border-border rounded-lg text-muted hover:text-red-500 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!loading && hasMore && errores.length > 0 && !searchTyped.trim() && (
          <div className="border-t border-border py-4 flex justify-center">
            <button onClick={loadMore} className="flex items-center gap-2 px-5 py-2 rounded-lg border border-border text-sm font-medium text-muted hover:text-foreground transition-all disabled:opacity-50">
              {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {loadingMore ? "Cargando..." : "Cargar más"}
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={deletingId !== null} onClose={() => setDeletingId(null)} title="¿Eliminar registro?" type="danger" onConfirm={() => deletingId && confirmDelete(deletingId)} />
      <Modal isOpen={isBulkDeleting} onClose={() => setIsBulkDeleting(false)} title={`¿Eliminar ${selectedIds.length} elementos?`} type="danger" onConfirm={confirmBulkDelete} />

      {/* Edit Modal */}
      <AnimatePresence>
        {editForm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }} transition={{ duration: 0.15 }} className="bg-card border border-border rounded-xl shadow-xl p-6 max-w-2xl w-full relative max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-base font-semibold text-foreground">Editar Registro</h2>
                <button onClick={() => setEditForm(null)} className="p-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] rounded-lg transition-all text-muted hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted">Fecha</label>
                    <input type="date" value={editForm!.fecha ? editForm!.fecha.split("T")[0] : ""} onChange={(e) => setEditForm({ ...editForm!, fecha: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted">Legajo</label>
                    <input type="text" value={editForm!.legajo || ""} onChange={(e) => setEditForm({ ...editForm!, legajo: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted">Nombre Completo</label>
                  <input type="text" value={editForm!.nombre_apellido || ""} onChange={(e) => setEditForm({ ...editForm!, nombre_apellido: e.target.value.toUpperCase() })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all uppercase" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted">Motivo</label>
                    <select value={editForm!.motivo_error || ""} onChange={(e) => setEditForm({ ...editForm!, motivo_error: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all">
                      {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted">Sector</label>
                    <input type="text" value={editForm!.sector || ""} onChange={(e) => setEditForm({ ...editForm!, sector: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4 border border-border rounded-lg bg-black/[0.03] dark:bg-white/[0.03]">
                  {[
                    { label: "Horas Normales", key: "horas_normales" as const },
                    { label: "Horas 50%", key: "horas_50" as const },
                    { label: "Horas 100%", key: "horas_100" as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted text-center">{label}</label>
                      <input type="number" step="0.5" value={editForm![key] || ""} onChange={(e) => setEditForm({ ...editForm!, [key]: parseFloat(e.target.value) || null })} className="w-full bg-background border border-border rounded-lg px-2 py-2 text-sm text-foreground text-center focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all" />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted">Notas</label>
                  <textarea value={editForm!.notas || ""} onChange={(e) => setEditForm({ ...editForm!, notas: e.target.value })} rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setEditForm(null)} className="flex-1 py-2.5 text-sm font-medium text-muted border border-border rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all">Cancelar</button>
                  <button onClick={saveEdit} disabled={editLoading} className="flex-[2] py-2.5 bg-accent-gold hover:bg-accent-gold-dark text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm">
                    {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
