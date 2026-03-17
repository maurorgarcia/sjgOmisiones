"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
import { ErrorCarga, MOTIVO_COLORS, PAGE_SIZE } from "@/types";
import { StatsCharts } from "@/components/StatsCharts";
import { Skeleton, TableSkeleton } from "@/components/Skeleton";

function getMotivoBadge(motivo: string) {
  const classes = MOTIVO_COLORS[motivo] ?? "bg-slate-900/50 text-slate-400 border-white/5";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${classes} shadow-sm`}>
      {motivo}
    </span>
  );
}

export default function ReportePage() {
  const [errores, setErrores] = useState<ErrorCarga[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [filtro, setFiltro] = useState<"todos" | "pendientes" | "resueltos">("pendientes");
  const [filtroMotivo, setFiltroMotivo] = useState<string>("todos");
  const [filtroSector, setFiltroSector] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<string>(() => {
    if (typeof window === "undefined") return new Date().toISOString().split("T")[0];
    return sessionStorage.getItem("sjg_working_date") || new Date().toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("sjg_fecha_hasta") || "";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'nombre_apellido', direction: 'asc' });

  // Highlighting
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

  useEffect(() => {
    fetchErrores();
  }, [filtro, filtroMotivo, filtroSector, fechaDesde, fechaHasta, sortConfig]);

  function buildQuery() {
    let query = supabase
      .from("error_carga")
      .select("*");

    if (sortConfig) {
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      if (sortConfig.key !== 'fecha') {
        query = query.order('fecha', { ascending: false });
      }
    } else {
      query = query.order("nombre_apellido", { ascending: true });
    }

    if (fechaDesde) {
      const startIso = `${fechaDesde}T00:00:00.000Z`;
      const endIso = fechaHasta
        ? `${fechaHasta}T23:59:59.999Z`
        : `${fechaDesde}T23:59:59.999Z`;
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("changes-reporte")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "error_carga" },
        (payload) => {
          const newRow = payload.new as ErrorCarga;

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

  const handleDownload = async () => {
    try {
      const params = new URLSearchParams({
        filter: filtro,
        motivo: filtroMotivo,
        ...(fechaDesde && { fecha: fechaDesde }),
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
      a.download = cd?.includes("filename=") ? cd.split("filename=")[1].replace(/\"/g, "") : `omisiones_${filtro}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Excel generado correctamente.");
    } catch {
      toast.error("Ocurrió un error al descargar el archivo.");
    }
  };

  const total = filteredErrores.length;
  const pendientes = filteredErrores.filter((e) => !e.resuelto).length;
  const resueltos = filteredErrores.filter((e) => e.resuelto).length;
  const pct = total > 0 ? Math.round((resueltos / total) * 100) : 0;

  const dateLabel = fechaDesde
    ? fechaHasta
      ? `${format(new Date(fechaDesde + "T12:00:00"), "d/M/yyyy", { locale: es })} – ${format(new Date(fechaHasta + "T12:00:00"), "d/M/yyyy", { locale: es })}`
      : format(new Date(fechaDesde + "T12:00:00"), "EEEE d 'de' MMMM", { locale: es })
    : "Todos los registros";

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-amber-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Reporte de Errores</h1>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">{dateLabel}</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 border border-white/10 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-amber-500 transition-all shadow-xl active:scale-95 disabled:opacity-50"
        >
          <ExternalLink className="w-4 h-4" />
          Descargar Excel
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5 shadow-2xl group hover:border-amber-500/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/5 p-2 rounded-xl group-hover:bg-amber-500/10 transition-colors">
              <AlertTriangle className="w-5 h-5 text-amber-500/70" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</p>
              <p className="text-2xl font-black text-white">{total}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950/40 rounded-2xl p-4 border border-amber-500/10 shadow-2xl group hover:border-amber-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/5 p-2 rounded-xl group-hover:bg-amber-500/10 transition-colors">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Pendientes</p>
              <p className="text-2xl font-black text-white">{pendientes}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950/40 rounded-2xl p-4 border border-emerald-500/10 shadow-2xl group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/5 p-2 rounded-xl group-hover:bg-emerald-500/10 transition-colors">
              <CheckCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Resueltos</p>
              <p className="text-2xl font-black text-white">{resueltos}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5 shadow-2xl group hover:border-amber-500/20 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-white/5 p-2 rounded-xl group-hover:bg-white/10 transition-colors">
              <TrendingDown className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resolución</p>
              <p className="text-2xl font-black text-white">{pct}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
          <Skeleton className="h-[280px]" />
        </div>
      ) : (
        errores.length > 0 && <StatsCharts data={errores} />
      )}

      <div className="bg-slate-900/50 px-4 py-3 rounded-2xl border border-white/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-1 p-1 bg-black/40 rounded-xl w-full md:w-auto overflow-x-auto border border-white/5">
          {(["pendientes", "resueltos", "todos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 ${
                filtro === f
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <select
            value={filtroMotivo}
            onChange={(e) => setFiltroMotivo(e.target.value)}
            className="px-4 py-2 rounded-xl border border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400 focus:ring-2 focus:ring-amber-500/50 outline-none transition bg-black/40 hover:bg-black/60 cursor-pointer"
          >
            <option value="todos">Todos los motivos</option>
            {Object.keys(MOTIVO_COLORS).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <div className="relative flex-grow sm:flex-grow-0 min-w-[140px]">
            <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filtroSector}
              onChange={(e) => setFiltroSector(e.target.value)}
              placeholder="Sector..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-white/5 text-xs font-medium text-slate-300 placeholder:text-slate-600 focus:ring-2 focus:ring-amber-500/50 outline-none transition bg-black/40 hover:bg-black/60"
            />
          </div>

          <div className="relative flex-grow sm:flex-grow-0">
            <Calendar className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                const val = e.target.value;
                setFechaDesde(val);
                sessionStorage.setItem("sjg_working_date", val);
              }}
              className="w-full sm:w-auto pl-9 pr-4 py-2 rounded-xl border border-white/5 text-xs font-medium text-slate-300 focus:ring-2 focus:ring-amber-500/50 outline-none transition bg-black/40 hover:bg-black/60 [color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-grow sm:flex-grow-0">
            <span className="text-xs text-slate-500 hidden sm:inline">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                const val = e.target.value;
                setFechaHasta(val);
                if (val) sessionStorage.setItem("sjg_fecha_hasta", val);
                else sessionStorage.removeItem("sjg_fecha_hasta");
              }}
              className="w-full sm:w-auto pl-4 py-2 rounded-xl border border-white/5 text-xs font-medium text-slate-300 focus:ring-2 focus:ring-amber-500/50 outline-none transition bg-black/40 hover:bg-black/60 [color-scheme:dark]"
              title="Hasta (opcional, para rango)"
            />
          </div>
          <button
            onClick={() => {
              setFechaDesde("");
              setFechaHasta("");
              setFiltro("todos");
            }}
            className="text-[10px] text-amber-500 hover:text-amber-400 font-black uppercase tracking-widest whitespace-nowrap px-4 py-2 rounded-xl border border-amber-500/10 hover:bg-amber-500/5 transition-all"
          >
            Ver Histórico
          </button>
        </div>
      </div>

      {!loading && errores.length > 0 && (
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, legajo o OT..."
            className="flex-1 max-w-xs border border-white/5 rounded-xl pl-4 py-2 text-xs font-medium text-slate-300 placeholder:text-slate-700 focus:ring-2 focus:ring-amber-500/50 outline-none transition bg-black/40 hover:bg-black/60 shadow-inner"
          />
          {searchQuery.trim() && (
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Mostrando {filteredErrores.length} de {errores.length}
            </span>
          )}
        </div>
      )}

      <div className="bg-slate-950/40 rounded-2xl border border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase bg-black/60 border-b border-white/5 tracking-[0.2em] font-black">
              <tr>
                <th className="px-5 py-3.5">
                  <button onClick={() => handleSort('resuelto')} className="flex items-center gap-1 hover:text-amber-500 transition-colors">
                    Estado
                    {sortConfig?.key === 'resuelto' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <button onClick={() => handleSort('fecha')} className="flex items-center gap-1 hover:text-amber-500 transition-colors">
                    Fecha
                    {sortConfig?.key === 'fecha' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <button onClick={() => handleSort('nombre_apellido')} className="flex items-center gap-1 hover:text-amber-500 transition-colors">
                    Empleado
                    {sortConfig?.key === 'nombre_apellido' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5">
                  <button onClick={() => handleSort('motivo_error')} className="flex items-center gap-1 hover:text-amber-500 transition-colors">
                    Motivo
                    {sortConfig?.key === 'motivo_error' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5 font-semibold">OT / Sector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-500">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Cargando datos maestros...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredErrores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
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
                    className={`hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${err.resuelto ? "opacity-40 grayscale-[0.5]" : ""}`}
                  >
                    <td className="px-5 py-4">
                      {err.resuelto ? (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resuelto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.1)]">
                          <Clock className="w-3.5 h-3.5" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-white text-sm">
                        {format(new Date(err.fecha), "dd MMM yyyy", { locale: es })}
                      </div>
                      <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{err.dia_semana}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div 
                        onClick={() => toggleNameHighlight(err.nombre_apellido)}
                        className={`font-bold text-sm cursor-pointer transition-all ${checkedNames.has(err.nombre_apellido) ? "text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 shadow-lg scale-[1.02]" : "text-slate-200 hover:text-amber-400"}`}
                        title="Click para marcar progreso"
                      >
                        {err.nombre_apellido}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Leg: {err.legajo}</div>
                    </td>
                    <td className="px-5 py-4">
                      {getMotivoBadge(err.motivo_error)}
                      {err.notas && (
                        <div className="text-[10px] font-medium text-slate-500 mt-1.5 max-w-[200px] truncate italic" title={err.notas}>
                          "{err.notas}"
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-300 text-xs uppercase tracking-tight">{err.sector}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
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
          <div className="border-t border-white/5 py-6 flex justify-center bg-black/20">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:bg-white/10 hover:text-amber-500 transition-all disabled:opacity-50 active:scale-95 shadow-xl"
            >
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
              {loadingMore ? "Cargando…" : "Cargar más registros"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

