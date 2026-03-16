"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
  FilterX
} from "lucide-react";
import { Faltante } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TableSkeleton } from "@/components/Skeleton";
import { toast } from "sonner";

export default function FaltantesReporte() {
  const [data, setData] = useState<Faltante[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [fechaDesde, setFechaDesde] = useState(() => {
    if (typeof window === "undefined") return new Date().toISOString().split("T")[0];
    return sessionStorage.getItem("sjg_working_date") || new Date().toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("sjg_fecha_hasta") || "";
  });

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

  useEffect(() => {
    fetchFaltantes();
  }, [sortConfig, fechaDesde, fechaHasta]);

  const fetchFaltantes = async () => {
    setLoading(true);
    let query = supabase.from("faltantes").select("*");
    
    // Date filter logic
    if (fechaDesde) {
      const startIso = `${fechaDesde}T00:00:00.000Z`;
      const endIso = fechaHasta
        ? `${fechaHasta}T23:59:59.999Z`
        : `${fechaDesde}T23:59:59.999Z`;
      query = query.gte("fecha", startIso).lte("fecha", endIso);
    }

    if (sortConfig) {
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      if (sortConfig.key !== 'fecha') {
        query = query.order('fecha', { ascending: false });
      }
    } else {
      query = query.order("nombre_apellido", { ascending: true });
    }

    const { data: res, error } = await query;
    if (res) setData(res);
    if (error) {
      console.error(error);
      toast.error("Error al cargar los datos de reporte.");
    }
    setLoading(false);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const resetFilters = () => {
    setFechaDesde(new Date().toISOString().split("T")[0]);
    setFechaHasta("");
    setSearchQuery("");
  };

  const filtered = searchQuery.trim()
    ? data.filter(f => 
        f.nombre_apellido.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.contrato.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.sector && f.sector.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (f.motivo && f.motivo.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : data;

  const handleExport = () => {
    toast.info("Función de exportar para Faltantes estará disponible próximamente.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            <div className="absolute inset-0 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping opacity-30" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Reporte de Faltantes</h1>
            <p className="text-slate-500 text-sm mt-0.5">Listado histórico de personal sin registros cargados.</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Descargar Datos
        </button>
      </div>

      {/* Modern Filter Bar */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                sessionStorage.setItem("sjg_working_date", e.target.value);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Fecha Hasta <span className="text-[8px] opacity-60">(opcional)</span>
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                if (e.target.value) sessionStorage.setItem("sjg_fecha_hasta", e.target.value);
                else sessionStorage.removeItem("sjg_fecha_hasta");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Search className="w-3 h-3" /> Buscar
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre, contrato..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
              />
              <button 
                onClick={resetFilters}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500 transition-colors"
                title="Limpiar filtros"
              >
                <FilterX className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-400 uppercase tracking-[0.15em] bg-slate-50/50 border-b border-slate-100 font-bold">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Contrato</th>
                <th className="px-6 py-4 whitespace-nowrap">Empleado</th>
                <th className="px-6 py-4">Sector</th>
                <th className="px-6 py-4">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <TableSkeleton rows={8} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-slate-50 p-4 rounded-full">
                        <AlertCircle className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="font-semibold text-slate-700">No se encontraron registros</p>
                      <p className="text-xs text-slate-400">Pruebe ajustando los filtros.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="font-bold text-slate-900">
                          {format(new Date(f.fecha), "dd MMM yyyy", { locale: es })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                        {f.contrato}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        onClick={() => toggleNameHighlight(f.nombre_apellido)}
                        className={`font-extrabold cursor-pointer transition-colors ${checkedNames.has(f.nombre_apellido) ? "text-green-600 bg-green-50 px-2 py-0.5 rounded-lg border border-green-200 shadow-sm" : "text-slate-900"}`}
                        title="Click para marcar/desmarcar progreso"
                      >
                        {f.nombre_apellido}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Building2 className="w-3.5 h-3.5 opacity-50" />
                        <span className="font-medium">{f.sector || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <FileText className="w-3.5 h-3.5 opacity-50" />
                        <span className="font-medium">{f.motivo || "—"}</span>
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
