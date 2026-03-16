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
  const classes = MOTIVO_COLORS[motivo] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${classes}`}>
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
  const [fechaDesde, setFechaDesde] = useState<string>(new Date().toISOString().split("T")[0]);
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

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
    } else {
      query = query.order("fecha", { ascending: false });
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reporte de Errores</h1>
          <p className="text-slate-500 text-sm mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
        >
          <ExternalLink className="w-4 h-4" />
          Descargar Excel
        </button>
      </div>

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

      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
          {(["pendientes", "resueltos", "todos"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap active:scale-95 ${
                filtro === f ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <select
            value={filtroMotivo}
            onChange={(e) => setFiltroMotivo(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
          >
            <option value="todos">Todos los motivos</option>
            {Object.keys(MOTIVO_COLORS).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <div className="relative flex-grow sm:flex-grow-0 min-w-[140px]">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filtroSector}
              onChange={(e) => setFiltroSector(e.target.value)}
              placeholder="Sector..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
            />
          </div>

          <div className="relative flex-grow sm:flex-grow-0">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full sm:w-auto pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-grow sm:flex-grow-0">
            <span className="text-xs text-slate-500 hidden sm:inline">a</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full sm:w-auto pl-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white"
              title="Hasta (opcional, para rango)"
            />
          </div>
          <button
            onClick={() => {
              setFechaDesde("");
              setFechaHasta("");
              setFiltro("todos");
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap px-2"
          >
            Ver Histórico
          </button>
        </div>
      </div>

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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 font-semibold">
                  <button onClick={() => handleSort('resuelto')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase tracking-wider">
                    Estado
                    {sortConfig?.key === 'resuelto' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  <button onClick={() => handleSort('fecha')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase tracking-wider">
                    Fecha
                    {sortConfig?.key === 'fecha' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  <button onClick={() => handleSort('nombre_apellido')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase tracking-wider">
                    Empleado
                    {sortConfig?.key === 'nombre_apellido' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5 font-semibold">
                  <button onClick={() => handleSort('motivo_error')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase tracking-wider">
                    Motivo
                    {sortConfig?.key === 'motivo_error' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3.5 font-semibold">OT / Sector</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="text-sm">Cargando datos...</span>
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
                    className={`hover:bg-slate-50/80 transition-colors ${err.resuelto ? "opacity-60" : ""}`}
                  >
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
                      <div className="text-xs text-slate-400">Leg: {err.legajo}</div>
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
          <div className="border-t border-slate-100 py-4 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
              {loadingMore ? "Cargando…" : "Cargar más"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

