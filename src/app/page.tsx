"use client";

import { useEffect, useState } from "react";
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
  Info,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ErrorCarga, MOTIVO_COLORS, PAGE_SIZE } from "@/types";
import { StatsCharts } from "@/components/StatsCharts";
import { Modal } from "@/components/Modal";
import { Skeleton, TableSkeleton, CardSkeleton } from "@/components/Skeleton";
import { motion, AnimatePresence } from "framer-motion";


function getMotivoBadge(motivo: string) {
  const classes = MOTIVO_COLORS[motivo] ?? "bg-slate-500/10 text-slate-500 border-slate-500/20";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${classes} shadow-sm`}>
      {motivo}
    </span>
  );
}

export default function Dashboard() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const [errores, setErrores] = useState<ErrorCarga[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);

  // Helper to get today's local date in YYYY-MM-DD
  const getTodayLocal = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
  };

  const [filtro, setFiltro] = useState<"todos" | "pendientes" | "resueltos">(() => {
    if (typeof window === "undefined") return "pendientes";
    const saved = sessionStorage.getItem("sjg_filtro");
    return (saved === "todos" || saved === "pendientes" || saved === "resueltos") ? saved : "pendientes";
  });

  const [filtroMotivo, setFiltroMotivo] = useState<string>(() => {
    if (typeof window === "undefined") return "todos";
    return sessionStorage.getItem("sjg_filtro_motivo") || "todos";
  });

  const [filtroSector, setFiltroSector] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("sjg_filtro_sector") || "";
  });

  const [fechaFiltro, setFechaFiltro] = useState<string>(() => {
    if (typeof window === "undefined") return getTodayLocal();
    return sessionStorage.getItem("sjg_working_date") || getTodayLocal();
  });

  const [fechaHasta, setFechaHasta] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("sjg_fecha_hasta") || "";
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Edit modal
  const [editingError, setEditingError] = useState<ErrorCarga | null>(null);
  const [editNotas, setEditNotas] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editOt, setEditOt] = useState("");
  const [editHorario, setEditHorario] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm and Bulk Selection
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'nombre_apellido', direction: 'asc' });

  // Highlighting (Progress tracking)
  const [checkedNames, setCheckedNames] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const saved = sessionStorage.getItem("sjg_checked_names");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const toggleNameHighlight = (name: string) => {
    const newChecked = new Set(checkedNames);
    if (newChecked.has(name)) newChecked.delete(name);
    else newChecked.add(name);
    setCheckedNames(newChecked);
    sessionStorage.setItem("sjg_checked_names", JSON.stringify(Array.from(newChecked)));
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredErrores.map((err) => err.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirmBulkDelete = async () => {
    await supabase.from("error_carga").delete().in("id", selectedIds);
    setSelectedIds([]);
    setIsBulkDeleting(false);
    toast.success(`${selectedIds.length} registros eliminados correctamente.`);
    fetchErrores();
  };

  useEffect(() => {
    fetchErrores();
  }, [filtro, filtroMotivo, filtroSector, fechaFiltro, fechaHasta, sortConfig]);

  function buildQuery() {
    let query = supabase
      .from("error_carga")
      .select("*");

    if (sortConfig) {
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      // Add secondary sort by fecha desc to keep it stable
      if (sortConfig.key !== 'fecha') {
        query = query.order('fecha', { ascending: false });
      }
    } else {
      query = query.order("nombre_apellido", { ascending: true });
    }

    if (fechaFiltro) {
      const startIso = `${fechaFiltro}T00:00:00.000Z`;
      const endIso = fechaHasta
        ? `${fechaHasta}T23:59:59.999Z`
        : `${fechaFiltro}T23:59:59.999Z`;
      query = query.gte("fecha", startIso).lte("fecha", endIso);
    }
    if (filtro === "pendientes") query = query.eq("resuelto", false);
    if (filtro === "resueltos") query = query.eq("resuelto", true);
    if (filtroMotivo !== "todos") query = query.eq("motivo_error", filtroMotivo);
    if (filtroSector.trim()) query = query.ilike("sector", `%${filtroSector.trim()}%`);
    return query;
  }

  const fetchErrores = async () => {
    setLoading(true);
    const query = buildQuery().range(0, PAGE_SIZE - 1);
    const { data, error } = await query;
    if (data) {
      setErrores(data);
      setHasMore(data.length === PAGE_SIZE);
    }
    if (error) console.error(error);
    setLoading(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const from = errores.length;
    const query = buildQuery().range(from, from + PAGE_SIZE - 1);
    const { data, error } = await query;
    if (data) {
      setErrores((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }
    if (error) console.error(error);
    setLoadingMore(false);
  };

  // Búsqueda en tabla (client-side)
  const filteredErrores = searchQuery.trim()
    ? errores.filter((e) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          e.nombre_apellido.toLowerCase().includes(q) ||
          e.legajo.includes(searchQuery.trim()) ||
          (e.ot && e.ot.includes(searchQuery.trim()))
        );
      })
    : errores;

  const toggleResuelto = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from("error_carga")
      .update({ resuelto: !currentStatus })
      .eq("id", id);
    if (!error) {
       toast.success(currentStatus ? "Registro reabierto." : "Registro resuelto.");
       fetchErrores();
    } else {
       toast.error("Error al actualizar el estado.");
    }
  };

  const openEdit = (err: ErrorCarga) => {
    setEditingError(err);
    setEditNotas(err.notas || "");
    setEditSector(err.sector);
    setEditOt(err.ot || "");
    setEditHorario(err.horario || "");
  };

  const saveEdit = async () => {
    if (!editingError) return;
    setEditLoading(true);
    await supabase.from("error_carga").update({
      notas: editNotas || null,
      sector: editSector,
      ot: editOt || null,
      horario: editHorario || null,
    }).eq("id", editingError.id);
    setEditLoading(false);
    setEditingError(null);
    toast.success("Registro actualizado correctamente.");
    fetchErrores();
  };

  const confirmDelete = async (id: number) => {
    const { error } = await supabase.from("error_carga").delete().eq("id", id);
    if (!error) {
      toast.success("Registro eliminado.");
    } else {
      toast.error("Error al eliminar.");
    }
    setDeletingId(null);
    fetchErrores();
  };

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "error_carga" },
        (payload) => {
          const newRow = payload.new as ErrorCarga;
          
          // Basic logic: only add if we are not filtering by a specific search query 
          // that might exclude it, or if it matches current global status filters.
          // For simplicity and "wow" factor, we add it if it matches the current 'filtro' (pendientes/todos)
          const isPendiente = !newRow.resuelto;
          const matchesStatus = 
            filtro === "todos" || 
            (filtro === "pendientes" && isPendiente) || 
            (filtro === "resueltos" && !isPendiente);

          if (matchesStatus) {
            setErrores((prev) => [newRow, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filtro]);

  const handleDownload = async () => {
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
      a.download = cd?.includes("filename=") ? cd.split("filename=")[1].replace(/"/g, "") : `omisiones_${filtro}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error("Ocurrió un error al descargar el archivo.");
    }
  };

  const handleSendEmail = async () => {
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
      toast.success("✅ Correo enviado exitosamente a los responsables.");
    } catch (err: any) {
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // KPI stats (sobre los datos visibles después de búsqueda)
  const total = filteredErrores.length;
  const pendientes = filteredErrores.filter((e) => !e.resuelto).length;
  const resueltos = filteredErrores.filter((e) => e.resuelto).length;
  const pct = total > 0 ? Math.round((resueltos / total) * 100) : 0;

  const dateLabel = fechaFiltro
    ? fechaHasta
      ? `${format(new Date(fechaFiltro + "T12:00:00"), "d/M/yyyy", { locale: es })} – ${format(new Date(fechaHasta + "T12:00:00"), "d/M/yyyy", { locale: es })}`
      : format(new Date(fechaFiltro + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })
    : "Todos los registros";

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <div className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping opacity-30" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">Gestión de Omisiones</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">{dateLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Descargar: available to all users (admin + viewer) */}
          <button
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-card/20 px-4 py-2.5 border border-border text-xs font-bold text-slate-500 hover:bg-card/40 hover:text-accent-gold transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Admin-only actions */}
          {isAdmin && (
            <>
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setIsBulkDeleting(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-50 text-red-600 px-4 py-2.5 border border-red-200 text-sm font-semibold hover:bg-red-100 transition shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar ({selectedIds.length})
                </button>
              )}
              <Link
                href="/carga"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-black text-black uppercase tracking-tight hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                Nuevo Registro
              </Link>
              <button
                onClick={handleSendEmail}
                disabled={sending || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-5 py-2.5 text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 active:scale-95 shadow-lg"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar Reporte
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card/40 rounded-2xl p-4 border border-border shadow-2xl group hover:border-accent-gold/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/5 p-2 rounded-xl group-hover:bg-amber-500/10 transition-colors">
              <AlertTriangle className="w-5 h-5 text-amber-500/70" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</p>
              <p className="text-2xl font-black text-foreground">{total}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/40 rounded-2xl p-4 border border-accent-gold/10 shadow-2xl group hover:border-accent-gold/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/5 p-2 rounded-xl group-hover:bg-amber-500/10 transition-colors">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Pendientes</p>
              <p className="text-2xl font-black text-foreground">{pendientes}</p>
            </div>
          </div>
        </div>
        <div className="bg-card/40 rounded-2xl p-4 border border-emerald-500/10 shadow-2xl group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/5 p-2 rounded-xl group-hover:bg-emerald-500/10 transition-colors">
              <CheckCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Resueltos</p>
              <p className="text-2xl font-black text-foreground">{resueltos}</p>
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
              <p className="text-2xl font-black text-foreground">{pct}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
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
      <div className="bg-sidebar/50 px-4 py-3 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-1 p-1 bg-background/60 rounded-xl w-full md:w-auto overflow-x-auto border border-border">
          {(["pendientes", "resueltos", "todos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFiltro(f);
                sessionStorage.setItem("sjg_filtro", f);
              }}
              className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 ${
                filtro === f
                  ? "bg-gradient-to-r from-accent-gold to-accent-gold-dark text-black shadow-lg"
                  : "text-slate-500 hover:text-foreground hover:bg-white/5 dark:hover:bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <select
            value={filtroMotivo}
            onChange={(e) => {
              setFiltroMotivo(e.target.value);
              sessionStorage.setItem("sjg_filtro_motivo", e.target.value);
            }}
            className="px-4 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest text-slate-500 focus:ring-2 focus:ring-accent-gold/50 outline-none transition bg-background hover:bg-card cursor-pointer shadow-inner appearance-none"
          >
            <option value="todos" className="bg-card font-black uppercase">Todos los motivos</option>
            {Object.keys(MOTIVO_COLORS).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <div className="relative flex-grow sm:flex-grow-0 min-w-[140px]">
            <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filtroSector}
              onChange={(e) => {
                setFiltroSector(e.target.value);
                sessionStorage.setItem("sjg_filtro_sector", e.target.value);
              }}
              placeholder="Sector..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border text-xs font-black uppercase tracking-widest text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 dark:placeholder:opacity-50 focus:ring-2 focus:ring-accent-gold/50 outline-none transition bg-background hover:bg-card shadow-inner"
            />
          </div>

          <div className="relative flex-grow sm:flex-grow-0">
            <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => {
                const newDate = e.target.value;
                setFechaFiltro(newDate);
                if (newDate) sessionStorage.setItem("sjg_working_date", newDate);
                const today = new Date().toISOString().split("T")[0];
                if (newDate !== today) {
                  setFiltro("todos");
                  sessionStorage.setItem("sjg_filtro", "todos");
                }
              }}
              className="w-full sm:w-auto pl-9 pr-4 py-2 rounded-xl border border-border text-xs font-medium text-foreground focus:ring-2 focus:ring-accent-gold/50 outline-none transition bg-background hover:bg-card shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-grow sm:flex-grow-0">
            <span className="text-xs text-slate-500 hidden sm:inline">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                const v = e.target.value;
                setFechaHasta(v);
                if (v) sessionStorage.setItem("sjg_fecha_hasta", v);
                else sessionStorage.removeItem("sjg_fecha_hasta");
              }}
              className="w-full sm:w-auto pl-4 py-2 rounded-xl border border-border text-xs font-medium text-foreground focus:ring-2 focus:ring-accent-gold/50 outline-none transition bg-background hover:bg-card shadow-inner [color-scheme:light] dark:[color-scheme:dark]"
              title="Hasta (opcional, para rango)"
            />
          </div>
          <button
            onClick={() => {
              setFechaFiltro("");
              setFechaHasta("");
              setFiltro("todos");
              sessionStorage.removeItem("sjg_working_date");
              sessionStorage.removeItem("sjg_fecha_hasta");
              sessionStorage.setItem("sjg_filtro", "todos");
            }}
            className="text-[10px] text-accent-gold hover:text-accent-gold-dark font-black uppercase tracking-widest whitespace-nowrap px-4 py-2 rounded-xl border border-accent-gold/10 hover:bg-accent-gold/5 transition-all shadow-inner active:scale-95"
          >
            Ver Histórico
          </button>
        </div>
      </div>

      {/* Búsqueda en tabla */}
      {!loading && errores.length > 0 && (
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, legajo o OT..."
            className="flex-1 max-w-xs border border-border rounded-xl pl-4 py-2 text-xs font-medium text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 dark:placeholder:opacity-50 focus:ring-2 focus:ring-accent-gold/50 outline-none transition bg-background hover:bg-card shadow-inner"
          />
          {searchQuery.trim() && (
            <span className="text-xs text-slate-500">
              Mostrando {filteredErrores.length} de {errores.length}
            </span>
          )}
        </div>
      )}

      {/* Table */}
        <div className="bg-card/40 rounded-2xl border border-border shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase bg-sidebar/60 border-b border-border tracking-[0.2em] font-black">
              <tr>
                {isAdmin && (
                  <th className="px-5 py-3.5 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={filteredErrores.length > 0 && selectedIds.length === filteredErrores.length} 
                      className="rounded border-border bg-card text-accent-gold focus:ring-accent-gold cursor-pointer" 
                    />
                  </th>
                )}
                <th className="px-5 py-3.5 font-semibold">
                  <button onClick={() => handleSort('resuelto')} className="flex items-center gap-1 hover:text-accent-gold transition-colors uppercase tracking-wider">
                    Estado
                    {sortConfig?.key === 'resuelto' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  <button onClick={() => handleSort('fecha')} className="flex items-center gap-1 hover:text-accent-gold transition-colors uppercase tracking-wider">
                    Fecha
                    {sortConfig?.key === 'fecha' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  <button onClick={() => handleSort('nombre_apellido')} className="flex items-center gap-1 hover:text-accent-gold transition-colors uppercase tracking-wider">
                    Empleado
                    {sortConfig?.key === 'nombre_apellido' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  <button onClick={() => handleSort('motivo_error')} className="flex items-center gap-1 hover:text-accent-gold transition-colors uppercase tracking-wider">
                    Motivo
                    {sortConfig?.key === 'motivo_error' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5 font-black uppercase tracking-widest text-slate-500">OT / Sector</th>
                <th className="px-5 py-3.5 font-black uppercase tracking-widest text-right text-slate-500">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12">
                     <TableSkeleton rows={8} />
                  </td>
                </tr>
              ) : filteredErrores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-slate-100 p-4 rounded-full">
                        <CheckCheck className="w-7 h-7 text-slate-400" />
                      </div>
                      <p className="font-semibold text-slate-700 mt-1">
                        {errores.length === 0
                          ? "No hay errores para mostrar"
                          : "Ningún registro coincide con la búsqueda"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {errores.length === 0
                          ? filtro === "pendientes"
                            ? "¡Todo al día! No hay nada pendiente."
                            : "No se encontraron registros con este filtro."
                          : `Hay ${errores.length} registro(s) con los filtros de fecha/motivo/sector. Probá otro término.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredErrores.map((err) => (
                  <tr
                    key={err.id}
                    className={`hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${err.resuelto ? "opacity-60" : ""} ${selectedIds.includes(err.id) ? "bg-accent-gold/5" : ""}`}
                  >
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          onChange={() => handleSelectOne(err.id)} 
                          checked={selectedIds.includes(err.id)} 
                          className="rounded border-border bg-card text-accent-gold focus:ring-accent-gold cursor-pointer" 
                        />
                      </td>
                    )}
                    <td className="px-5 py-3.5">
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
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-foreground text-sm">
                        {format(new Date(err.fecha), "dd MMM yyyy", { locale: es })}
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{err.dia_semana}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div 
                        onClick={() => toggleNameHighlight(err.nombre_apellido)}
                        className={`font-bold text-sm cursor-pointer transition-all ${checkedNames.has(err.nombre_apellido) ? "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/20 shadow-lg scale-[1.02]" : "text-foreground hover:text-accent-gold"}`}
                        title="Click para marcar/desmarcar progreso"
                      >
                        {err.nombre_apellido}
                      </div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                        Leg: {err.legajo}
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(err.legajo); }}
                          className="hover:text-accent-gold transition-colors"
                          title="Copiar legajo"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {getMotivoBadge(err.motivo_error)}
                      {err.notas && (
                        <div className="text-[10px] font-bold text-slate-500 mt-1.5 max-w-[200px] truncate italic uppercase tracking-tight" title={err.notas}>
                          "{err.notas}"
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-foreground text-xs uppercase tracking-tight">{err.sector}</div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                        {err.ot ? `OT: ${err.ot}` : "Sin OT"}{err.horario ? ` · ${err.horario}` : ""}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Always visible: Resolver/Reabrir */}
                        <button
                          onClick={() => toggleResuelto(err.id, err.resuelto)}
                          className={`text-[10px] font-black uppercase tracking-widest transition-all ${err.resuelto ? "text-slate-500 hover:text-foreground" : "text-accent-gold hover:text-accent-gold-dark"}`}
                        >
                          {err.resuelto ? "Reabrir" : "Resolver"}
                        </button>
                        
                        {/* Admin only: Editar & Eliminar */}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEdit(err)}
                              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 hover:text-foreground transition-all shadow-inner"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(err.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-all shadow-inner"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
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
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
              {loadingMore ? "Cargando…" : "Cargar más registros"}
            </button>
          </div>
        )}
      </div>

      {/* Delete Single Modal */}
      <Modal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="¿Eliminar registro?"
        description="Esta acción no se puede deshacer. El registro seleccionado será eliminado permanentemente de la base de datos."
        type="danger"
        confirmLabel="Eliminar Registro"
        onConfirm={() => deletingId && confirmDelete(deletingId)}
      />

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleting}
        onClose={() => setIsBulkDeleting(false)}
        title={`¿Eliminar ${selectedIds.length} registros?`}
        description="Has seleccionado múltiples registros para eliminar. Esta operación es permanente y afectará a todos los elementos seleccionados."
        type="danger"
        confirmLabel={`Eliminar ${selectedIds.length} elementos`}
        onConfirm={confirmBulkDelete}
      />

      {/* Edit modal */}
      {editingError && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-card rounded-[2.5rem] shadow-2xl p-8 max-w-lg w-full border border-border overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-gold to-accent-gold-dark" />
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Editar Registro</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 opacity-70">
                  {editingError.nombre_apellido} · Leg. {editingError.legajo}
                </p>
              </div>
              <button 
                onClick={() => setEditingError(null)} 
                className="p-2.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all text-slate-500 hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sector</label>
                  <div className="relative group/input">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-accent-gold transition-colors" />
                    <input 
                      type="text" 
                      value={editSector} 
                      onChange={(e) => setEditSector(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT (10 dígitos)</label>
                  <div className="relative group/input">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-accent-gold transition-colors" />
                    <input 
                      type="text" 
                      value={editOt}
                      onChange={(e) => setEditOt(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all"
                      placeholder="Opcional" 
                      maxLength={10} 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Horario</label>
                <div className="relative group/input">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within/input:text-accent-gold transition-colors" />
                  <input 
                    type="text" 
                    value={editHorario} 
                    onChange={(e) => setEditHorario(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all"
                    placeholder="Ej: 06:00 a 14:00" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Notas Observaciones</label>
                <textarea 
                  value={editNotas} 
                  onChange={(e) => setEditNotas(e.target.value)} 
                  rows={4}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-bold text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 outline-none focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 transition-all resize-none" 
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end mt-10">
              <button 
                onClick={() => setEditingError(null)}
                className="px-6 py-3 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                onClick={saveEdit} 
                disabled={editLoading}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-accent-gold to-accent-gold-dark hover:from-accent-gold-dark hover:to-accent-gold text-black text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl shadow-accent-gold/20 active:scale-95 disabled:opacity-50"
              >
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Guardar cambios
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
