"use client";

import { CheckCircle2, Loader2, Maximize2, Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MOTIVOS, CONTRATOS } from "@/types";
import { useCargaForm } from "./useCargaForm";
import { EmpleadoSearch } from "@/components/EmpleadoSearch";
import { HorasDetalle } from "@/components/HorasDetalle";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ErrorCarga } from "@/types";

// ─── Shared field components ───────────────────────────────────────────────

const fieldLabel = "block text-[11px] font-medium uppercase tracking-wide mb-1.5 text-muted";

const inputBase = (hasError?: boolean) =>
  `relative h-10 bg-background border rounded-lg flex items-center transition-all focus-within:ring-2 focus-within:ring-accent-gold/30 focus-within:border-accent-gold ${
    hasError ? "border-red-400 bg-red-500/[0.03]" : "border-border"
  }`;

const inputCls = "w-full h-full bg-transparent border-none px-3 outline-none text-sm font-normal placeholder:text-muted text-foreground";

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-red-500 text-[11px] mt-1 font-medium">{msg}</p> : null;

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = ({ hasError, className, ...props }: InputProps) => (
  <div className={inputBase(hasError)}>
    <input {...props} className={`${inputCls} ${className || ""}`} />
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

const Select = ({ hasError, className, children, ...props }: SelectProps) => (
  <div className={inputBase(hasError)}>
    <select {...props} className={`${inputCls} appearance-none cursor-pointer ${className || ""}`}>
      {children}
    </select>
    <div className="absolute right-3 pointer-events-none text-muted">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

const Textarea = ({ hasError, className, ...props }: TextareaProps) => (
  <div className={`${inputBase(hasError)} h-auto min-h-[72px] items-start py-2.5`}>
    <textarea {...props} className={`${inputCls} h-full resize-none`} />
  </div>
);

export default function CargaPage() {
  const f = useCargaForm();
  const [recentEntries, setRecentEntries] = useState<ErrorCarga[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const fetchRecent = useCallback(async () => {
    setLoadingRecent(true);
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const todayLocal = new Date(today.getTime() - offset * 60 * 1000).toISOString().split("T")[0];
    const { data } = await supabase
      .from("error_carga")
      .select("*")
      .gte("fecha", `${todayLocal}T00:00:00.000Z`)
      .lte("fecha", `${todayLocal}T23:59:59.999Z`)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setRecentEntries(data);
    setLoadingRecent(false);
  }, []);

  useEffect(() => { fetchRecent(); }, [fetchRecent, f.loading]);

  const activeOT = f.ots[f.activeOTIndex];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">

      {/* Header — limpio, sin glow */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Gestión de Omisiones</h1>
          <p className="text-sm text-muted mt-0.5">Panel de carga de errores de fichaje</p>
        </div>
        <button
          type="button"
          onClick={() => window.open("/carga/mini", "MiniCarga", "width=450,height=800")}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Modo Ventana</span>
        </button>
      </div>

      <form onSubmit={f.handleSubmit} className="space-y-4" noValidate>

        {/* Card 1: Empleado y Datos */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmpleadoSearch
              searchRef={f.searchRef}
              searchQuery={f.searchQuery}
              suggestions={f.suggestions}
              selectedEmpleados={f.selectedEmpleados}
              searchLoading={f.searchLoading}
              showSuggestions={f.showSuggestions}
              legajoManual={f.legajoManual}
              errors={f.errors}
              onSearch={f.handleSearch}
              onFocus={() => f.suggestions.length > 0 && f.setShowSuggestions(true)}
              onSelect={f.selectEmpleado}
              onAddManual={f.addManualEmpleado}
              onRemove={f.removeEmpleado}
              onClear={f.clearSearch}
              onLegajoChange={f.setLegajoManual}
            />
            <div className="space-y-4">
              <div>
                <label className={fieldLabel}>Fecha del Registro</label>
                <Input type="date" required value={f.fecha} onChange={(e) => f.setFecha(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={fieldLabel}>Contrato</label>
                  <Select
                    required
                    value={f.contrato}
                    onChange={(e) => { f.setContrato(e.target.value); f.setErrors((err) => ({ ...err, contrato: "" })); }}
                    hasError={!!f.errors.contrato}
                  >
                    <option value="">Seleccionar...</option>
                    {CONTRATOS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                  <FieldError msg={f.errors.contrato} />
                </div>
                <div>
                  <label className={fieldLabel}>Sector</label>
                  <Input
                    type="text"
                    value={f.sector}
                    onChange={(e) => { f.setSector(e.target.value); f.setErrors((err) => ({ ...err, sector: "" })); }}
                    hasError={!!f.errors.sector}
                    placeholder="Ej: Planta A"
                  />
                  <FieldError msg={f.errors.sector} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Multi-OT */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">

          {/* Tabs — más limpios */}
          <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {f.ots.map((ot, idx) => (
                <button
                  key={ot.id}
                  type="button"
                  onClick={() => f.setActiveOTIndex(idx)}
                  className={`flex-shrink-0 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                    f.activeOTIndex === idx
                      ? "bg-accent-gold text-white shadow-sm"
                      : "text-muted hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
                  }`}
                >
                  OT {idx + 1}
                  {f.errors[`motivo_${idx}`] || f.errors[`ot_${idx}`] || f.errors[`horarioDesde_${idx}`] || f.errors[`horarioHasta_${idx}`] ? (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-red-500 rounded-full align-middle" />
                  ) : null}
                </button>
              ))}
              <button
                type="button"
                onClick={f.addOT}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-accent-gold border border-dashed border-border hover:border-accent-gold/40 transition-all ml-1"
              >
                <Plus className="w-3 h-3" />
                Nueva OT
              </button>
            </div>
            {f.ots.length > 1 && (
              <button
                type="button"
                onClick={() => f.removeOT(activeOT.id)}
                className="p-1.5 rounded-md text-muted hover:text-red-500 hover:bg-red-500/8 transition-all ml-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active OT */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeOT.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className={fieldLabel}>Motivo</label>
                      <Select
                        required
                        value={activeOT.motivo}
                        onChange={(e) => f.updateOT(activeOT.id, { motivo: e.target.value })}
                        hasError={!!f.errors[`motivo_${f.activeOTIndex}`]}
                      >
                        <option value="">Seleccionar motivo...</option>
                        {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </Select>
                      <FieldError msg={f.errors[`motivo_${f.activeOTIndex}`]} />
                    </div>
                    <div>
                      <label className={fieldLabel}>
                        Número de OT {activeOT.motivo === "OT Inexistente" && <span className="text-muted normal-case font-normal">(No aplica)</span>}
                      </label>
                      <Input
                        type="text"
                        value={activeOT.ot}
                        onChange={(e) => f.updateOT(activeOT.id, { ot: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                        disabled={activeOT.motivo === "OT Inexistente"}
                        hasError={!!f.errors[`ot_${f.activeOTIndex}`]}
                        className="disabled:opacity-30"
                        placeholder="Ej: 0012300456"
                      />
                      <FieldError msg={f.errors[`ot_${f.activeOTIndex}`]} />
                    </div>
                    <div>
                      <label className={fieldLabel}>Horario (OT {f.activeOTIndex + 1})</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Input
                            type="time"
                            value={activeOT.horarioDesde}
                            onChange={(e) => f.updateOT(activeOT.id, { horarioDesde: e.target.value })}
                            hasError={!!f.errors[`horarioDesde_${f.activeOTIndex}`]}
                          />
                          <FieldError msg={f.errors[`horarioDesde_${f.activeOTIndex}`]} />
                        </div>
                        <div>
                          <Input
                            type="time"
                            value={activeOT.horarioHasta}
                            onChange={(e) => f.updateOT(activeOT.id, { horarioHasta: e.target.value })}
                            hasError={!!f.errors[`horarioHasta_${f.activeOTIndex}`]}
                          />
                          <FieldError msg={f.errors[`horarioHasta_${f.activeOTIndex}`]} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="bg-background border border-border rounded-lg p-4">
                    <HorasDetalle
                      horasNormales={activeOT.horasNormales}
                      setHorasNormales={(v) => f.updateOT(activeOT.id, { horasNormales: v })}
                      hsNormalesMods={activeOT.hsNormalesMods}
                      setHsNormalesMods={(v) => f.updateOT(activeOT.id, { hsNormalesMods: v })}
                      horas50={activeOT.horas50}
                      setHoras50={(v) => f.updateOT(activeOT.id, { horas50: v })}
                      hs50Mods={activeOT.hs50Mods}
                      setHs50Mods={(v) => f.updateOT(activeOT.id, { hs50Mods: v })}
                      horas100={activeOT.horas100}
                      setHoras100={(v) => f.updateOT(activeOT.id, { horas100: v })}
                      hs100Mods={activeOT.hs100Mods}
                      setHs100Mods={(v) => f.updateOT(activeOT.id, { hs100Mods: v })}
                      isSecondary
                    />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="px-6 pb-4 flex items-center justify-between text-xs font-medium text-muted border-t border-border pt-3">
            <div className="flex gap-3">
              {f.activeOTIndex > 0 && (
                <button type="button" onClick={() => f.setActiveOTIndex(f.activeOTIndex - 1)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <ArrowLeft className="w-3 h-3" /> Anterior
                </button>
              )}
              {f.activeOTIndex < f.ots.length - 1 && (
                <button type="button" onClick={() => f.setActiveOTIndex(f.activeOTIndex + 1)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  Siguiente <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <span className="text-muted">OT {f.activeOTIndex + 1} de {f.ots.length}</span>
          </div>
        </div>

        {/* Card 3: Notas y Submit */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <label className={fieldLabel}>Notas adicionales</label>
            <Textarea
              value={f.notas}
              onChange={(e) => f.setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones relevantes para el cierre..."
            />
          </div>
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => f.router.push("/")}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted hover:text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={f.loading}
              className="flex-1 max-w-xs bg-accent-gold hover:bg-accent-gold-dark text-white font-semibold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              {f.loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Procesando...</span></>
              ) : (
                <><CheckCircle2 className="w-4 h-4 opacity-80" /><span>Guardar Todo</span></>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Historial Hoy */}
      {!f.loading && !f.searchQuery && (
        <div className="mt-8">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Cargados hoy</h2>
          {loadingRecent ? (
            <div className="h-12 bg-card border border-border rounded-lg animate-pulse" />
          ) : recentEntries.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">Sin registros cargados hoy</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-8">
              {recentEntries.map((err) => (
                <div key={err.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between hover:border-accent-gold/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-accent-gold/10 flex items-center justify-center text-[10px] font-semibold text-accent-gold uppercase">
                      {err.nombre_apellido.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{err.nombre_apellido}</p>
                      <p className="text-[10px] text-muted">{err.motivo_error}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted font-mono">{err.ot || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
