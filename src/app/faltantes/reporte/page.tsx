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
  ExternalLink
} from "lucide-react";
import { Faltante } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TableSkeleton } from "@/components/Skeleton";
import { toast } from "sonner";

export default function FaltantesReporte() {
  const [data, setData] = useState<Faltante[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'fecha', direction: 'desc' });

  useEffect(() => {
    fetchFaltantes();
  }, [sortConfig]);

  const fetchFaltantes = async () => {
    let query = supabase.from("faltantes").select("*");
    
    if (sortConfig) {
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
    } else {
      query = query.order("fecha", { ascending: false });
    }

    const { data: res, error } = await query;
    if (res) setData(res);
    if (error) console.error(error);
    setLoading(false);
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Reporte de Faltantes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Listado histórico de personal sin registros cargados.</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Descargar Datos
        </button>
      </div>

      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar registros..."
          className="flex-1 text-sm outline-none bg-transparent"
        />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-400 uppercase tracking-[0.15em] bg-slate-50/50 border-b border-slate-100 font-bold">
              <tr>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('fecha')} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                    Fecha
                    {sortConfig?.key === 'fecha' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
                <th className="px-6 py-4">Contrato</th>
                <th className="px-6 py-4">
                  <button onClick={() => handleSort('nombre_apellido')} className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
                    Empleado
                    {sortConfig?.key === 'nombre_apellido' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </button>
                </th>
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
                      <div className="font-extrabold text-slate-900">{f.nombre_apellido}</div>
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
