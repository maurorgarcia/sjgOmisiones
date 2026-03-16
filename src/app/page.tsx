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
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "next-auth/react";

type ErrorCarga = {
  id: number;
  fecha: string;
  dia_semana: string;
  legajo: string;
  nombre_apellido: string;
  motivo_error: string;
  ot: string | null;
  sector: string;
  horario: string | null;
  notas: string | null;
  resuelto: boolean;
  horas_normales?: number | null;
  hs_normales_insa?: boolean;
  hs_normales_polu?: boolean;
  hs_normales_noct?: boolean;
  horas_50?: number | null;
  hs_50_insa?: boolean;
  hs_50_polu?: boolean;
  hs_50_noct?: boolean;
  horas_100?: number | null;
  hs_100_insa?: boolean;
  hs_100_polu?: boolean;
  hs_100_noct?: boolean;
};

const MOTIVO_COLORS: Record<string, string> = {
  "OT Inexistente": "bg-orange-100 text-orange-800 border-orange-200",
  "Saldo hrs insuficiente": "bg-red-100 text-red-800 border-red-200",
  "Par de fichada incompleto": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Omisión": "bg-purple-100 text-purple-800 border-purple-200",
  "Otro": "bg-slate-100 text-slate-700 border-slate-200",
};

const PAGE_SIZE = 50;

function getMotivoBadge(motivo: string) {
  const classes = MOTIVO_COLORS[motivo] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${classes}`}>
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
  const [filtro, setFiltro] = useState<"todos" | "pendientes" | "resueltos">("pendientes");
  const [filtroMotivo, setFiltroMotivo] = useState<string>("todos");
  const [filtroSector, setFiltroSector] = useState<string>("");
  const [fechaFiltro, setFechaFiltro] = useState<string>(new Date().toISOString().split("T")[0]);
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Restore all filter state from sessionStorage on mount
  useEffect(() => {
    const savedDate = sessionStorage.getItem("sjg_working_date");
    const savedFiltro = sessionStorage.getItem("sjg_filtro") as "todos" | "pendientes" | "resueltos" | null;
    const savedMotivo = sessionStorage.getItem("sjg_filtro_motivo");
    const savedSector = sessionStorage.getItem("sjg_filtro_sector");
    const savedHasta = sessionStorage.getItem("sjg_fecha_hasta");
    if (savedDate) setFechaFiltro(savedDate);
    if (savedFiltro) setFiltro(savedFiltro);
    if (savedMotivo) setFiltroMotivo(savedMotivo);
    if (savedSector) setFiltroSector(savedSector);
    if (savedHasta) setFechaHasta(savedHasta);
  }, []);

  // Edit modal
  const [editingError, setEditingError] = useState<ErrorCarga | null>(null);
  const [editNotas, setEditNotas] = useState("");
  const [editSector, setEditSector] = useState("");
  const [editOt, setEditOt] = useState("");
  const [editHorario, setEditHorario] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // Delete confirm and Bulk Selection
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(filteredErrores.map((err) => err.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const confirmBulkDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar ${selectedIds.length} registros permanentemente?`)) return;
    await supabase.from("error_carga").delete().in("id", selectedIds);
    setSelectedIds([]);
    fetchErrores();
  };

  useEffect(() => {
    fetchErrores();
  }, [filtro, filtroMotivo, filtroSector, fechaFiltro, fechaHasta]);

  function buildQuery() {
    let query = supabase
      .from("error_carga")
      .select("*")
      .order("fecha", { ascending: false });

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
    if (!error) fetchErrores();
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
    fetchErrores();
  };

  const confirmDelete = async (id: number) => {
    await supabase.from("error_carga").delete().eq("id", id);
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
      if (!res.ok) { alert("No hay datos o hubo un error al exportar."); return; }
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
      alert("Ocurrió un error al descargar el archivo.");
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
      alert("✅ Correo enviado exitosamente a los responsables.");
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bandeja de Errores</h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Descargar: available to all users (admin + viewer) */}
          <button
            onClick={handleDownload}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            Descargar
          </button>

          {/* Admin-only actions */}
          {isAdmin && (
            <>
              {selectedIds.length > 0 && (
                <button
                  onClick={confirmBulkDelete}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-50 text-red-600 px-4 py-2.5 border border-red-200 text-sm font-semibold hover:bg-red-100 transition shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar ({selectedIds.length})
                </button>
              )}
              <Link
                href="/carga"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition shadow-sm shadow-blue-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                Nuevo Registro
              </Link>
              <button
                onClick={handleSendEmail}
                disabled={sending || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-sm shadow-emerald-500/20 disabled:opacity-50"
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
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-slate-900">{total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-2 rounded-xl">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Pendientes</p>
              <p className="text-2xl font-bold text-slate-900">{pendientes}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-green-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 p-2 rounded-xl">
              <CheckCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Resueltos</p>
              <p className="text-2xl font-bold text-slate-900">{resueltos}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-slate-50 p-2 rounded-xl">
              <TrendingDown className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Resolución</p>
              <p className="text-2xl font-bold text-slate-900">{pct}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
          {(["pendientes", "resueltos", "todos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => {
                setFiltro(f);
                sessionStorage.setItem("sjg_filtro", f);
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                filtro === f
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
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
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
          >
            <option value="todos">Todos los motivos</option>
            {Object.keys(MOTIVO_COLORS).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <div className="relative flex-grow sm:flex-grow-0 min-w-[140px]">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filtroSector}
              onChange={(e) => {
                setFiltroSector(e.target.value);
                sessionStorage.setItem("sjg_filtro_sector", e.target.value);
              }}
              placeholder="Sector..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
            />
          </div>

          <div className="relative flex-grow sm:flex-grow-0">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              className="w-full sm:w-auto pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
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
              className="w-full sm:w-auto pl-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
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
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap px-2"
          >
            Ver Histórico
          </button>
        </div>
      </div>

      {/* Búsqueda en tabla */}
      {!loading && errores.length > 0 && (
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, legajo o OT..."
            className="flex-1 max-w-xs border border-slate-200 rounded-xl pl-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
          />
          {searchQuery.trim() && (
            <span className="text-xs text-slate-500">
              Mostrando {filteredErrores.length} de {errores.length}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                {isAdmin && (
                  <th className="px-5 py-3.5 w-12 text-center">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={filteredErrores.length > 0 && selectedIds.length === filteredErrores.length} 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                    />
                  </th>
                )}
                <th className="px-5 py-3.5 font-semibold">Estado</th>
                <th className="px-5 py-3.5 font-semibold">Fecha</th>
                <th className="px-5 py-3.5 font-semibold">Empleado</th>
                <th className="px-5 py-3.5 font-semibold">Motivo</th>
                <th className="px-5 py-3.5 font-semibold">OT / Sector</th>
                <th className="px-5 py-3.5 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-sm">Cargando datos...</span>
                    </div>
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
                    className={`hover:bg-slate-50/80 transition-colors ${err.resuelto ? "opacity-60" : ""} ${selectedIds.includes(err.id) ? "bg-blue-50/50" : ""}`}
                  >
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-center">
                        <input 
                          type="checkbox" 
                          onChange={() => handleSelectOne(err.id)} 
                          checked={selectedIds.includes(err.id)} 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                        />
                      </td>
                    )}
                    <td className="px-5 py-3.5">
                      {err.resuelto ? (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resuelto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                          <Clock className="w-3.5 h-3.5" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        {format(new Date(err.fecha), "dd MMM yyyy", { locale: es })}
                      </div>
                      <div className="text-xs text-slate-400">{err.dia_semana}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{err.nombre_apellido}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        Leg: {err.legajo}
                        <button
                          onClick={() => navigator.clipboard.writeText(err.legajo)}
                          className="hover:text-blue-500 transition-colors"
                          title="Copiar legajo"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {getMotivoBadge(err.motivo_error)}
                      {err.notas && (
                        <div className="text-xs text-slate-400 mt-1 max-w-[180px] truncate" title={err.notas}>
                          {err.notas}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{err.sector}</div>
                      <div className="text-xs text-slate-400">
                        {err.ot ? `OT: ${err.ot}` : "Sin OT"}{err.horario ? ` · ${err.horario}` : ""}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Always visible: Resolver/Reabrir */}
                        <button
                          onClick={() => toggleResuelto(err.id, err.resuelto)}
                          className={`text-sm font-semibold transition-colors ${err.resuelto ? "text-slate-400 hover:text-slate-700" : "text-blue-600 hover:text-blue-800"}`}
                        >
                          {err.resuelto ? "Reabrir" : "Resolver"}
                        </button>
                        
                        {/* Admin only: Editar & Eliminar */}
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEdit(err)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(err.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
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
          <div className="border-t border-slate-100 py-4 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {loadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {loadingMore ? "Cargando…" : "Cargar más"}
            </button>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-100 p-2 rounded-xl"><Trash2 className="w-5 h-5 text-red-600" /></div>
              <h3 className="font-bold text-slate-900">¿Eliminar registro?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">Esta acción no se puede deshacer. El registro será eliminado permanentemente.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeletingId(null)}
                className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={() => confirmDelete(deletingId)}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition shadow-sm">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingError && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-slate-900">Editar Registro</h3>
                <p className="text-xs text-slate-400 mt-0.5">{editingError.nombre_apellido} · Leg. {editingError.legajo}</p>
              </div>
              <button onClick={() => setEditingError(null)} className="p-2 hover:bg-slate-100 rounded-xl transition">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Sector</label>
                  <input type="text" value={editSector} onChange={(e) => setEditSector(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">OT (10 dígitos)</label>
                  <input type="text" value={editOt}
                    onChange={(e) => setEditOt(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="Opcional" maxLength={10} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Horario</label>
                <input type="text" value={editHorario} onChange={(e) => setEditHorario(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                  placeholder="Ej: 06:00 a 14:00" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Notas</label>
                <textarea value={editNotas} onChange={(e) => setEditNotas(e.target.value)} rows={3}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition resize-none" />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-5">
              <button onClick={() => setEditingError(null)}
                className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button onClick={saveEdit} disabled={editLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition shadow-sm disabled:opacity-50">
                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
