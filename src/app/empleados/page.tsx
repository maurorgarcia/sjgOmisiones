"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, Pencil, Trash2, CheckCircle2, X, PlusCircle, 
  UserSquare2, ArrowUpDown, ArrowUp, ArrowDown, Building2, UserCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Empleado = {
  id: number;
  nombre_apellido: string;
  legajo: string;
  contrato: string;
  categoria: string | null;
};

const CONTRATOS = ["6700302926", "6700248017"];

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  
  // Edit states
  const [editName, setEditName] = useState("");
  const [editLegajo, setEditLegajo] = useState("");
  const [editContrato, setEditContrato] = useState("");
  const [editCat, setEditCat] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchEmpleados = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("empleados").select("*").order("nombre_apellido", { ascending: true });
    if (data) setEmpleados(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmpleados();
  }, [fetchEmpleados]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return empleados;
    const q = searchQuery.toLowerCase();
    return empleados.filter(e => 
      e.nombre_apellido.toLowerCase().includes(q) || 
      e.legajo.includes(searchQuery.trim()) ||
      e.contrato.includes(searchQuery.trim())
    );
  }, [empleados, searchQuery]);

  const openEdit = (e: Empleado) => {
    setEditingEmpleado(e);
    setEditName(e.nombre_apellido);
    setEditLegajo(e.legajo);
    setEditContrato(e.contrato);
    setEditCat(e.categoria || "");
  };

  const handleSave = async () => {
    if (!editingEmpleado) return;
    setSaveLoading(true);
    const { error } = await supabase
      .from("empleados")
      .update({
        nombre_apellido: editName.toUpperCase(),
        legajo: editLegajo,
        contrato: editContrato,
        categoria: editCat || null
      })
      .eq("id", editingEmpleado.id);

    if (error) {
       toast.error("Error al actualizar: " + error.message);
    } else {
       toast.success("Empleado actualizado correctamente.");
       fetchEmpleados();
       setEditingEmpleado(null);
    }
    setSaveLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este empleado?")) return;
    const { error } = await supabase.from("empleados").delete().eq("id", id);
    if (error) {
       toast.error("Error al eliminar.");
    } else {
       toast.success("Empleado eliminado.");
       fetchEmpleados();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-10 bg-accent-gold rounded-full shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">Base de Empleados</h1>
            <p className="text-slate-600 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">Gestión de personal para carga de omisiones</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => window.location.href = "/importar"}
             className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/40 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-card hover:text-accent-gold transition-all"
           >
             <PlusCircle className="w-4 h-4" />
             Importar Excel
           </button>
        </div>
      </div>

      <div className="bg-card/40 rounded-[2.5rem] border border-border p-6 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, legajo o contrato..."
            className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-foreground outline-none focus:ring-4 focus:ring-accent-gold/10 transition-all placeholder:text-slate-600 dark:placeholder:text-slate-700"
          />
          {!loading && (
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-background/60 px-3 py-1.5 rounded-lg border border-border">
               Total: {filtered.length}
             </span>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-border">
           {/* Desktop Table View */}
           <div className="hidden md:block overflow-x-auto">
             <table className="w-full text-left text-xs">
                <thead className="bg-background/60 text-slate-600 dark:text-slate-500 uppercase font-black tracking-widest border-b border-border">
                   <tr>
                      <th className="px-6 py-4">Empleado</th>
                      <th className="px-6 py-4">Legajo</th>
                      <th className="px-6 py-4">Contrato</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border">
                   {loading ? (
                     <tr>
                       <td colSpan={4} className="py-20 text-center text-slate-500 animate-pulse font-black uppercase tracking-[0.2em]">Cargando base...</td>
                     </tr>
                   ) : filtered.length === 0 ? (
                     <tr>
                       <td colSpan={4} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest">No se encontraron empleados.</td>
                     </tr>
                   ) : (
                     filtered.map((e) => (
                       <tr key={e.id} className="hover:bg-black/5 dark:hover:bg-white/5 group transition-colors">
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-accent-gold/5 flex items-center justify-center text-[10px] font-black border border-accent-gold/10 text-accent-gold transition-colors group-hover:bg-accent-gold group-hover:text-black">
                                  {e.nombre_apellido.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-foreground group-hover:text-accent-gold transition-colors uppercase">{e.nombre_apellido}</span>
                                  {e.categoria && <span className="text-[10px] text-slate-500 font-medium">{e.categoria}</span>}
                                </div>
                             </div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-500">{e.legajo}</td>
                          <td className="px-6 py-4">
                             <span className="text-[10px] font-black px-2 py-1 bg-black/5 dark:bg-white/5 border border-border rounded-lg text-slate-500 leading-none">{e.contrato}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(e)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-slate-500 hover:text-accent-gold transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDelete(e.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-500 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                             </div>
                          </td>
                       </tr>
                     ))
                   )}
                </tbody>
             </table>
           </div>

           {/* Mobile Card View */}
           <div className="md:hidden divide-y divide-border">
              {loading ? (
                <div className="p-10 text-center uppercase text-[10px] font-black tracking-widest opacity-50">Cargando base...</div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center uppercase text-[10px] font-black tracking-widest opacity-40">Sin resultados</div>
              ) : (
                filtered.map((e) => (
                  <div key={e.id} className="p-5 flex items-center justify-between gap-4 bg-card/20 group">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center font-black text-accent-gold text-xs shadow-inner">
                          {e.nombre_apellido.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                           <h4 className="text-sm font-black uppercase tracking-tight text-foreground">{e.nombre_apellido}</h4>
                           <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Leg: {e.legajo}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-700 opacity-30" />
                              <span className="text-[9px] font-black text-accent-gold/60 uppercase tracking-widest">{e.contrato}</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(e)} className="p-2.5 bg-background border border-border rounded-xl text-slate-500 hover:text-accent-gold shadow-sm"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-2.5 bg-background border border-border rounded-xl text-slate-500 hover:text-red-500 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingEmpleado && (
          <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} 
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-card rounded-[2.5rem] border border-border shadow-2xl p-8 max-w-lg w-full overflow-hidden relative"
             >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-gold to-accent-gold-dark" />
                <div className="flex justify-between items-center mb-8">
                   <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Editar Empleado</h2>
                   <button onClick={() => setEditingEmpleado(null)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all text-slate-500 hover:text-foreground">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre y Apellido</label>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-medium focus:ring-4 focus:ring-accent-gold/10 outline-none transition-all"
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Legajo SAP</label>
                        <input 
                          type="text" 
                          value={editLegajo}
                          onChange={(e) => setEditLegajo(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-mono focus:ring-4 focus:ring-accent-gold/10 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Contrato</label>
                        <select 
                          value={editContrato}
                          onChange={(e) => setEditContrato(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-accent-gold/10 outline-none appearance-none"
                        >
                           {CONTRATOS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-slate-400">Categoría (Opcional)</label>
                      <input 
                        type="text" 
                        value={editCat}
                        onChange={(e) => setEditCat(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-medium focus:ring-4 focus:ring-accent-gold/10 outline-none"
                      />
                   </div>

                   <div className="pt-4 flex gap-3">
                      <button 
                        onClick={() => setEditingEmpleado(null)}
                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-border rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleSave}
                        disabled={saveLoading}
                        className="flex-[2] py-4 bg-gradient-to-r from-accent-gold to-accent-gold-dark text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                         {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
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
