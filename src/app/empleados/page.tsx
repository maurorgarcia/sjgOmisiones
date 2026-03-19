"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Pencil, Trash2, CheckCircle2, X, PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Modal } from "@/components/Modal";

type Empleado = {
  id: number;
  nombre_apellido: string;
  legajo: string;
  contrato: string;
  categoria: string | null;
};

const CONTRATOS = ["6700302926", "6700248017"];

const inputCls = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all";
const labelCls = "block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted";

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
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

  useEffect(() => { fetchEmpleados(); }, [fetchEmpleados]);

  useEffect(() => {
    if (!editingEmpleado) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !saveLoading) setEditingEmpleado(null); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editingEmpleado, saveLoading]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return empleados;
    const q = searchQuery.toLowerCase();
    return empleados.filter((e) =>
      e.nombre_apellido.toLowerCase().includes(q) || e.legajo.includes(searchQuery.trim()) || e.contrato.includes(searchQuery.trim())
    );
  }, [empleados, searchQuery]);

  const openEdit = (e: Empleado) => {
    setEditingEmpleado(e); setEditName(e.nombre_apellido); setEditLegajo(e.legajo);
    setEditContrato(e.contrato); setEditCat(e.categoria || "");
  };

  const handleSave = async () => {
    if (!editingEmpleado) return;
    setSaveLoading(true);
    const { error } = await supabase.from("empleados").update({
      nombre_apellido: editName.toUpperCase(), legajo: editLegajo, contrato: editContrato, categoria: editCat || null,
    }).eq("id", editingEmpleado.id);
    if (error) { toast.error("Error al actualizar: " + error.message); }
    else { toast.success("Empleado actualizado correctamente."); fetchEmpleados(); setEditingEmpleado(null); }
    setSaveLoading(false);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    const { error } = await supabase.from("empleados").delete().eq("id", deletingId);
    if (error) { toast.error("Error al eliminar."); }
    else { toast.success("Empleado eliminado."); fetchEmpleados(); }
    setDeleteLoading(false);
    setDeletingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Base de Empleados</h1>
          <p className="text-sm text-muted mt-0.5">Gestión de personal para carga de omisiones</p>
        </div>
        <button
          onClick={() => window.location.href = "/importar"}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Importar Excel
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, legajo o contrato..."
              className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-accent-gold/30 focus:border-accent-gold outline-none transition-all"
            />
          </div>
          {!loading && (
            <span className="text-xs font-medium text-muted bg-background border border-border px-3 py-2 rounded-lg whitespace-nowrap">
              {filtered.length} empleados
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-[11px] font-medium text-muted uppercase tracking-wide border-b border-border">
                <tr>
                  <th className="px-5 py-3.5">Empleado</th>
                  <th className="px-5 py-3.5">Legajo</th>
                  <th className="px-5 py-3.5">Contrato</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={4} className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin text-accent-gold mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="py-16 text-center text-sm text-muted">No se encontraron empleados.</td></tr>
                ) : filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-black/[0.03] dark:hover:bg-white/[0.03] group transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent-gold/10 flex items-center justify-center text-[10px] font-semibold text-accent-gold border border-accent-gold/10">
                          {e.nombre_apellido.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{e.nombre_apellido}</span>
                          {e.categoria && <p className="text-xs text-muted">{e.categoria}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-muted">{e.legajo}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-medium px-2 py-1 bg-background border border-border rounded-md text-muted">{e.contrato}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(e)} className="p-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] rounded-md text-muted hover:text-accent-gold transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeletingId(e.id)} className="p-1.5 hover:bg-red-500/10 rounded-md text-muted hover:text-red-500 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
              <div className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin text-accent-gold mx-auto" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted">Sin resultados</div>
            ) : filtered.map((e) => (
              <div key={e.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center font-semibold text-accent-gold text-xs">
                    {e.nombre_apellido.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{e.nombre_apellido}</h4>
                    <p className="text-xs text-muted mt-0.5">Leg: {e.legajo} · {e.contrato}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(e)} className="p-2 border border-border rounded-lg text-muted hover:text-accent-gold transition-all">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeletingId(e.id)} className="p-2 border border-border rounded-lg text-muted hover:text-red-500 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="¿Eliminar empleado?"
        description="Esta acción no se puede deshacer. El empleado será eliminado permanentemente."
        type="danger"
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        loading={deleteLoading}
      />

      {/* Edit Modal */}
      <AnimatePresence>
        {editingEmpleado && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="bg-card border border-border rounded-xl shadow-xl p-6 max-w-lg w-full"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-base font-semibold text-foreground">Editar Empleado</h2>
                <button onClick={() => !saveLoading && setEditingEmpleado(null)} className="p-1.5 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] rounded-lg transition-all text-muted hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Nombre y Apellido</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Legajo SAP</label>
                    <input type="text" value={editLegajo} onChange={(e) => setEditLegajo(e.target.value)} className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <label className={labelCls}>Contrato</label>
                    <select value={editContrato} onChange={(e) => setEditContrato(e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}>
                      {CONTRATOS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={`${labelCls} opacity-60`}>Categoría (Opcional)</label>
                  <input type="text" value={editCat} onChange={(e) => setEditCat(e.target.value)} className={inputCls} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditingEmpleado(null)}
                    disabled={saveLoading}
                    className="flex-1 py-2.5 text-sm font-medium text-muted border border-border rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveLoading}
                    className="flex-[2] py-2.5 bg-accent-gold hover:bg-accent-gold-dark text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
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
