"use client";

import { useState, useMemo, useCallback, useEffect, memo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Copy,
  PlusCircle,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  TrendingDown,
  CheckCheck,
  Loader2,
  Trash2,
  Pencil,
  X,
  Search,
  Building2,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${classes} shadow-sm`}
    >
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTyped);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTyped, setSearch]);

  const toggleNameHighlight = useCallback((name: string) => {
    setCheckedNames((prev) => {
      const newChecked = new Set(prev);
      if (newChecked.has(name)) newChecked.delete(name);
      else newChecked.add(name);
      sessionStorage.setItem(
        "sjg_checked_names",
        JSON.stringify(Array.from(newChecked))
      );
      return newChecked;
    });
  }, []);

  const handleSelectAll = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) setSelectedIds(filteredErrores.map((err) => err.id));
      else setSelectedIds([]);
    },
    [filteredErrores]
  );

  const handleSelectOne = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const confirmBulkDelete = useCallback(async () => {
    await supabase.from("error_carga").delete().in("id", selectedIds);
    setSelectedIds([]);
    setIsBulkDeleting(false);
    toast.success(`${selectedIds.length} registros eliminados correctamente.`);
    fetchErrores();
  }, [selectedIds, fetchErrores]);

  const handleBulkResolve = useCallback(async () => {
    await supabase
      .from("error_carga")
      .update({ resuelto: true })
      .in("id", selectedIds);
    setSelectedIds([]);
    toast.success(`${selectedIds.length} registros marcados como resueltos.`);
    fetchErrores();
  }, [selectedIds, fetchErrores]);

  const toggleResuelto = useCallback(
    async (id: number, currentStatus: boolean) => {
      const newStatus = !currentStatus;
      const label = currentStatus ? "reabierto" : "resuelto";

      const { error } = await supabase
        .from("error_carga")
        .update({ resuelto: newStatus })
        .eq("id", id);

      if (error) {
        toast.error("Error al actualizar el estado.");
        return;
      }

      toast.success(`Registro ${label}.`);
      fetchErrores();
    },
    [fetchErrores]
  );

  const openEdit = useCallback((err: ErrorCarga) => {
    setEditForm({ ...err });
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editForm || !editForm.id) return;
    setEditLoading(true);
    const { error } = await supabase
      .from("error_carga")
      .update({
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
      })
      .eq("id", editForm.id);
    
    setEditLoading(false);
    if (!error) {
       setEditForm(null);
       toast.success("Registro actualizado correctamente.");
       fetchErrores();
    } else {
       toast.error("Error al actualizar: " + error.message);
    }
  }, [editForm, fetchErrores]);

  const confirmDelete = useCallback(
    async (id: number) => {
      const { error } = await supabase
        .from("error_carga")
        .delete()
        .eq("id", id);
      if (!error) {
        toast.success("Registro eliminado.");
      } else {
        toast.error("Error al eliminar.");
      }
      setDeletingId(null);
      fetchErrores();
    },
    [fetchErrores]
  );

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
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">Gestión de Omisiones</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">{dateLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleDownload} disabled={loading} className="p-2.5 rounded-xl border border-border hover:bg-card transition-all"><ExternalLink className="w-4 h-4" /></button>
          {isAdmin && (
            <>
              <Link href="/carga" className="bg-accent-gold px-5 py-2.5 rounded-xl text-black text-xs font-black uppercase tracking-tight shadow-lg active:scale-95 transition-all">Nuevo Registro</Link>
              <button onClick={handleSendEmail} disabled={sending || loading} className="px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="ml-2">Enviar Reporte</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card/40 rounded-2xl p-4 border border-border shadow-sm">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</p>
           <p className="text-2xl font-black text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card/40 rounded-2xl p-4 border border-accent-gold/10 shadow-sm text-accent-gold font-bold">
           <p className="text-[10px] uppercase tracking-widest opacity-70">Pendientes</p>
           <p className="text-2xl font-black text-foreground">{stats.pendientes}</p>
        </div>
        <div className="bg-card/40 rounded-2xl p-4 border border-emerald-500/10 shadow-sm text-emerald-500 font-bold">
           <p className="text-[10px] uppercase tracking-widest opacity-70">Resueltos</p>
           <p className="text-2xl font-black text-foreground">{stats.resueltos}</p>
        </div>
        <div className="bg-card/40 rounded-2xl p-4 border border-border shadow-sm">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resolución</p>
           <p className="text-2xl font-black text-foreground">{stats.pct}%</p>
        </div>
      </div>

      {loading ? <Skeleton className="h-[300px]" /> : errores.length > 0 && <StatsCharts data={errores} />}

      <div className="bg-sidebar/50 px-4 py-3 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row gap-3">
        <select value={filtroMotivo} onChange={(e) => setFiltroMotivo(e.target.value)} className="px-4 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest bg-background outline-none">
           <option value="todos">Todos los motivos</option>
           {Object.keys(MOTIVO_COLORS).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <div className="relative flex-1">
           <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
           <input type="text" value={filtroSector} onChange={(e) => setFiltroSector(e.target.value)} placeholder="Sector..." className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-xs font-black uppercase bg-background" />
        </div>
        <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="px-4 py-2 border border-border rounded-xl text-xs bg-background" />
        <button onClick={() => { setFechaFiltro(""); setFechaHasta(""); setFiltro("todos"); }} className="text-[10px] font-black text-accent-gold uppercase tracking-widest px-4 border border-accent-gold/10 rounded-xl hover:bg-accent-gold/5 transition-all">Histórico</button>
      </div>

      {!loading && errores.length > 0 && (
         <div className="flex items-center gap-2 max-w-xs">
            <Search className="w-4 h-4 text-slate-500" />
            <input type="text" value={searchTyped} onChange={(e) => setSearchTyped(e.target.value)} placeholder="Buscar..." className="w-full border border-border rounded-xl px-4 py-1.5 text-xs bg-background" />
         </div>
      )}

      <div className="bg-card/40 rounded-[2rem] md:rounded-2xl border border-border overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase bg-sidebar/60 border-b border-border tracking-[0.2em] font-black">
              <tr>
                {isAdmin && <th className="px-5 py-3 w-12 text-center" />}
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Fecha</th>
                <th className="px-5 py-4">Empleado</th>
                <th className="px-5 py-4">Motivo</th>
                <th className="px-5 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? <tr><td colSpan={6} className="py-12"><TableSkeleton rows={5} /></td></tr> : filteredErrores.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center uppercase text-[10px] font-black tracking-widest opacity-40">No se encontraron registros</td></tr>
              ) : filteredErrores.map(err => (
                 <tr key={err.id} className={`hover:bg-white/5 transition-colors ${err.resuelto ? "opacity-60" : ""}`}>
                   {isAdmin && <td className="px-5 text-center"><input type="checkbox" checked={selectedIds.includes(err.id)} onChange={() => handleSelectOne(err.id)} className="rounded border-border text-accent-gold focus:ring-accent-gold" /></td>}
                   <td className="px-5 py-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${err.resuelto ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-accent-gold/10 text-accent-gold border-accent-gold/20"}`}>
                        {err.resuelto ? "RESUELTO" : "PENDIENTE"}
                      </span>
                   </td>
                   <td className="px-5 py-4 font-bold text-xs">{format(new Date(err.fecha), "dd MMM yyyy")}</td>
                   <td className="px-5 py-4 font-black text-sm uppercase">{err.nombre_apellido}</td>
                   <td className="px-5 py-4">{getMotivoBadge(err.motivo_error)}</td>
                   <td className="px-5 py-4 text-right space-x-1">
                      <button onClick={() => toggleResuelto(err.id, err.resuelto)} className="p-1.5 hover:text-accent-gold transition-colors">{err.resuelto ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}</button>
                      {isAdmin && (
                        <>
                          <button onClick={() => openEdit(err)} className="p-1.5 hover:text-accent-gold transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeletingId(err.id)} className="p-1.5 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                   </td>
                 </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-border">
           {loading ? <div className="p-10 text-center uppercase text-[10px] font-black tracking-widest opacity-50">Cargando...</div> : filteredErrores.length === 0 ? (
             <div className="p-20 text-center uppercase text-[10px] font-black tracking-widest opacity-40">No hay registros</div>
           ) : filteredErrores.map(err => (
             <div key={err.id} className={`p-5 space-y-3 ${err.resuelto ? "opacity-60 bg-black/5" : ""}`}>
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-[10px] opacity-50 font-black">{format(new Date(err.fecha), "dd MMM yyyy")}</p>
                      <h4 className="font-black text-sm uppercase tracking-tight">{err.nombre_apellido}</h4>
                   </div>
                   <button onClick={() => toggleResuelto(err.id, err.resuelto)} className={`text-[9px] font-black border rounded-lg px-2 py-1 ${err.resuelto ? "text-emerald-500 border-emerald-500/20" : "text-accent-gold border-accent-gold/20"}`}>{err.resuelto ? "RESUELTO" : "RESOLVER"}</button>
                </div>
                <div className="flex justify-between items-center">
                   {getMotivoBadge(err.motivo_error)}
                   <div className="flex gap-2">
                     <button onClick={() => openEdit(err)} className="p-2 border rounded-xl"><Pencil className="w-4 h-4" /></button>
                     <button onClick={() => setDeletingId(err.id)} className="p-2 border rounded-xl"><Trash2 className="w-4 h-4" /></button>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>

      {!loading && hasMore && errores.length > 0 && !searchTyped.trim() && (
        <div className="flex justify-center py-6">
          <button onClick={loadMore} className="bg-background border border-border px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:text-accent-gold transition-all">
            {loadingMore ? "Cargando..." : "Cargar más"}
          </button>
        </div>
      )}

      <Modal isOpen={deletingId !== null} onClose={() => setDeletingId(null)} title="¿Eliminar registro?" type="danger" onConfirm={() => deletingId && confirmDelete(deletingId)} />
      <Modal isOpen={isBulkDeleting} onClose={() => setIsBulkDeleting(false)} title={`¿Eliminar ${selectedIds.length} elementos?`} type="danger" onConfirm={confirmBulkDelete} />

      <AnimatePresence>
        {editForm && (
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-card rounded-[2rem] p-8 max-w-2xl w-full border border-border shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
               <button onClick={() => setEditForm(null)} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
               <h3 className="text-xl font-black uppercase tracking-tight mb-8">Editar Registro</h3>
               
               <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black opacity-50 uppercase mb-1 block">Fecha</label>
                        <input type="date" value={editForm!.fecha ? editForm!.fecha.split("T")[0] : ""} onChange={(e) => setEditForm({ ...editForm!, fecha: e.target.value })} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold [color-scheme:dark]" />
                     </div>
                     <div>
                        <label className="text-[10px] font-black opacity-50 uppercase mb-1 block">Legajo</label>
                        <input type="text" value={editForm!.legajo || ""} onChange={(e) => setEditForm({ ...editForm!, legajo: e.target.value })} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold" />
                     </div>
                  </div>
                  <div>
                     <label className="text-[10px] font-black opacity-50 uppercase mb-1 block">Nombre Completo</label>
                     <input type="text" value={editForm!.nombre_apellido || ""} onChange={(e) => setEditForm({ ...editForm!, nombre_apellido: e.target.value.toUpperCase() })} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold uppercase" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-black opacity-50 uppercase mb-1 block">Motivo</label>
                        <select value={editForm!.motivo_error || ""} onChange={(e) => setEditForm({ ...editForm!, motivo_error: e.target.value })} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-bold uppercase">
                           {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-black opacity-50 uppercase mb-1 block">Sector</label>
                        <input type="text" value={editForm!.sector || ""} onChange={(e) => setEditForm({ ...editForm!, sector: e.target.value })} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold" />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-border/50 rounded-2xl bg-black/5 dark:bg-white/5">
                     <div>
                        <label className="text-[9px] font-black opacity-40 uppercase mb-1 block text-center">Horas Normales</label>
                        <input type="number" step="0.5" value={editForm!.horas_normales || ""} onChange={(e) => setEditForm({...editForm!, horas_normales: parseFloat(e.target.value) || null})} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-black text-center" />
                     </div>
                     <div>
                        <label className="text-[9px] font-black opacity-40 uppercase mb-1 block text-center">Horas 50%</label>
                        <input type="number" step="0.5" value={editForm!.horas_50 || ""} onChange={(e) => setEditForm({...editForm!, horas_50: parseFloat(e.target.value) || null})} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-black text-center" />
                     </div>
                     <div>
                        <label className="text-[9px] font-black opacity-40 uppercase mb-1 block text-center">Horas 100%</label>
                        <input type="number" step="0.5" value={editForm!.horas_100 || ""} onChange={(e) => setEditForm({...editForm!, horas_100: parseFloat(e.target.value) || null})} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-black text-center" />
                     </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black opacity-50 uppercase mb-1 block">Notas</label>
                     <textarea value={editForm!.notas || ""} onChange={(e) => setEditForm({ ...editForm!, notas: e.target.value })} rows={3} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-bold resize-none" />
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                     <button onClick={() => setEditForm(null)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest border border-border rounded-2xl">Cancelar</button>
                     <button onClick={saveEdit} disabled={editLoading} className="flex-1 py-4 bg-accent-gold text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-accent-gold/20 flex items-center justify-center gap-2">
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

function ModifierCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`px-3 py-1.5 rounded-xl text-[9px] font-black border transition-all ${checked ? "bg-accent-gold border-accent-gold text-black shadow-lg shadow-accent-gold/20" : "bg-transparent border-border text-slate-500 opacity-50"}`}
    >
      {label}
    </button>
  );
}
