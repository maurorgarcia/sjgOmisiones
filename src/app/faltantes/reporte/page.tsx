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
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-amber-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Reporte de Faltantes</h1>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-0.5">Listado histórico de personal sin registros cargados.</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 border border-white/10 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-amber-500 transition-all shadow-xl active:scale-95"
        >
          <ExternalLink className="w-4 h-4" />
          Descargar Datos
        </button>
      </div>

      {/* Modern Filter Bar */}
      <div className="bg-slate-950/40 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-4 backdrop-blur-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
              <Calendar className="w-3 h-3 group-hover:text-amber-500 transition-colors" /> Fecha Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                sessionStorage.setItem("sjg_working_date", e.target.value);
              }}
              className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-xs font-medium text-slate-300 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all [color-scheme:dark]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
              <Calendar className="w-3 h-3 group-hover:text-amber-500 transition-colors" /> Fecha Hasta <span className="text-[8px] opacity-40 font-bold">(Opcional)</span>
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                if (e.target.value) sessionStorage.setItem("sjg_fecha_hasta", e.target.value);
                else sessionStorage.removeItem("sjg_fecha_hasta");
              }}
              className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-xs font-medium text-slate-300 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all [color-scheme:dark]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2 group">
              <Search className="w-3 h-3 group-hover:text-amber-500 transition-colors" /> Buscar
            </label>
            <div className="relative group/input">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre, contrato..."
                className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-xs font-medium text-slate-300 placeholder:text-slate-700 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 outline-none transition-all shadow-inner"
              />
              <button 
                onClick={resetFilters}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-600 hover:text-amber-500 transition-colors rounded-lg hover:bg-white/5"
                title="Limpiar filtros"
              >
                <FilterX className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-950/40 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-500 uppercase bg-black/60 border-b border-white/5 tracking-[0.2em] font-black">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Contrato</th>
                <th className="px-6 py-4 whitespace-nowrap">Empleado</th>
                <th className="px-6 py-4">Sector</th>
                <th className="px-6 py-4">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-500">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Generando reporte...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-white/5 p-5 rounded-full border border-white/5 shadow-inner">
                        <AlertCircle className="w-10 h-10 text-slate-600" />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">No hay datos en este rango</p>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Ajuste la búsqueda para ver resultados.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-white/5 transition-all group border-b border-white/5 last:border-0">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/5 text-amber-500/70 rounded-2xl group-hover:bg-amber-500 group-hover:text-black transition-all duration-300 shadow-inner group-hover:shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div className="font-bold text-white text-sm">
                          {format(new Date(f.fecha), "dd MMM yyyy", { locale: es })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="font-black text-[10px] tracking-widest px-2.5 py-1.5 bg-white/5 text-slate-400 rounded-xl border border-white/5 uppercase shadow-inner group-hover:border-amber-500/20 transition-colors">
                        {f.contrato}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div 
                        onClick={() => toggleNameHighlight(f.nombre_apellido)}
                        className={`font-bold text-sm cursor-pointer transition-all ${checkedNames.has(f.nombre_apellido) ? "text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 shadow-lg scale-[1.02]" : "text-slate-200 hover:text-amber-400"}`}
                        title="Click para marcar progreso"
                      >
                        {f.nombre_apellido}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5 text-slate-400">
                        <Building2 className="w-3.5 h-3.5 text-slate-600" />
                        <span className="font-bold text-[11px] uppercase tracking-tight">{f.sector || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2.5 text-slate-400">
                        <FileText className="w-3.5 h-3.5 text-slate-600" />
                        <span className="font-bold text-[11px] uppercase tracking-tight">{f.motivo || "—"}</span>
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
