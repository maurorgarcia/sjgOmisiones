"use client";

import { CheckCircle2, Loader2, Maximize2 } from "lucide-react";
import { motion } from "framer-motion";
import { MOTIVOS, CONTRATOS } from "@/types";
import { useCargaForm } from "./useCargaForm";
import { EmpleadoSearch } from "@/components/EmpleadoSearch";
import { HorasDetalle } from "@/components/HorasDetalle";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ErrorCarga } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Shared input/select class helpers — keeps JSX clean and styles consistent
const inputCls = (hasError?: boolean) =>
  `w-full bg-background border rounded-xl px-4 py-3 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition text-sm font-black placeholder:text-slate-400 dark:placeholder:text-slate-700 text-foreground ${
    hasError ? "border-red-500/50 bg-red-500/5" : "border-border"
  }`;

const selectCls = (hasError?: boolean) =>
  `w-full bg-background border rounded-2xl px-4 py-3.5 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition text-sm font-black uppercase tracking-widest text-foreground appearance-none cursor-pointer ${
    hasError ? "border-red-500/50 bg-red-500/5" : "border-border"
  }`;

const labelCls = "block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-600 dark:text-slate-500 ml-1";

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-red-500 text-xs mt-1 font-bold">{msg}</p> : null;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CargaPage() {
  const f = useCargaForm();
  const [recentEntries, setRecentEntries] = useState<ErrorCarga[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const fetchRecent = useCallback(async () => {
    setLoadingRecent(true);
    const { data } = await supabase
      .from("error_carga")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setRecentEntries(data);
    setLoadingRecent(false);
  }, []);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent, f.loading]); // Refetch when loading changes (after save)

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-8 bg-accent-gold rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight uppercase">
              Cargar Registro
            </h1>
            <p className="text-slate-600 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0.5">
              Gestión de Omisiones y Errores SJG
            </p>
          </div>
        </div>
        <button
          onClick={() =>
            window.open(
              "/carga/mini",
              "MiniCarga",
              "width=450,height=800,menubar=no,toolbar=no,location=no,status=no"
            )
          }
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-accent-gold/20 bg-accent-gold/5 text-accent-gold text-[10px] font-black uppercase tracking-wider hover:bg-accent-gold/10 transition-all active:scale-95 shadow-lg"
          title="Abrir como ventana flotante para multitarea"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Modo Ventana</span>
        </button>
      </div>

      {/* Form card */}
      <div className="bg-card/40 rounded-[2.5rem] border border-border shadow-2xl p-8 backdrop-blur-xl">
        <form onSubmit={f.handleSubmit} className="space-y-5" noValidate>

          {/* ── Employee search ─────────────────────────────────────────── */}
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

          {/* ── Fecha ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>
                Fecha del Error <span className="text-accent-gold ml-1 font-bold">*</span>
              </label>
              <input
                type="date"
                required
                value={f.fecha}
                onChange={(e) => f.setFecha(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* ── Split OT Toggle ─────────────────────────────────────────── */}
          <div className="bg-accent-gold/5 p-4 rounded-3xl border border-accent-gold/10 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="split-ot-toggle"
                checked={f.splitOT}
                onChange={(e) => f.setSplitOT(e.target.checked)}
                className="w-5 h-5 rounded-lg border-border bg-background text-accent-gold focus:ring-accent-gold/20 cursor-pointer"
              />
              <label htmlFor="split-ot-toggle" className="text-[11px] font-black uppercase tracking-widest text-foreground cursor-pointer group-hover:text-accent-gold transition-colors">
                Dividir registro en 2 OTs (Ej: Saldo Insuficiente + Refuerzo)
              </label>
            </div>
          </div>

          {/* ── Contrato + Motivo 1 ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>
                Contrato <span className="text-accent-gold ml-1 font-bold">*</span>
              </label>
              <select
                required
                value={f.contrato}
                onChange={(e) => { f.setContrato(e.target.value); f.setErrors((err) => ({ ...err, contrato: "" })); }}
                className={selectCls(!!f.errors.contrato)}
              >
                <option value="">Seleccionar contrato...</option>
                {CONTRATOS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <FieldError msg={f.errors.contrato} />
            </div>

            <div>
              <label className={labelCls}>
                Motivo (OT 1) <span className="text-accent-gold ml-1 font-bold">*</span>
              </label>
              <select
                required
                value={f.motivo}
                onChange={(e) => { f.setMotivo(e.target.value); f.setErrors((err) => ({ ...err, motivo: "", ot: "" })); }}
                className={selectCls(!!f.errors.motivo)}
              >
                <option value="">Seleccione un motivo...</option>
                {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <FieldError msg={f.errors.motivo} />
            </div>
          </div>

          {/* ── Motivo 2 (Optional) ───────────────────────────────────────── */}
          {f.splitOT && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
              <div className="sm:col-span-2">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">Datos de la Segunda OT</p>
              </div>
              <div>
                <label className={labelCls}>
                  Motivo (OT 2) <span className="text-accent-gold ml-1 font-bold">*</span>
                </label>
                <select
                  required
                  value={f.motivo2}
                  onChange={(e) => { f.setMotivo2(e.target.value); f.setErrors((err) => ({ ...err, motivo2: "", ot2: "" })); }}
                  className={selectCls(!!f.errors.motivo2)}
                >
                  <option value="">Seleccione motivo...</option>
                  {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <FieldError msg={f.errors.motivo2} />
              </div>
              <div />
            </motion.div>
          )}

          {/* ── Sector + OT ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>
                Sector / Área <span className="text-accent-gold ml-1 font-bold">*</span>
              </label>
              <input
                type="text"
                value={f.sector}
                onChange={(e) => { f.setSector(e.target.value); f.setErrors((err) => ({ ...err, sector: "" })); }}
                className={inputCls(!!f.errors.sector)}
                placeholder="Ej: Planta A, Mantenimiento..."
              />
              <FieldError msg={f.errors.sector} />
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelCls}>
                  OT {f.splitOT ? "1" : ""}
                  {f.motivo && f.motivo !== "OT Inexistente" && (
                    <span className="text-slate-400 font-normal ml-1">(8-12 dígitos)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={f.ot}
                  onChange={(e) => { f.setOt(e.target.value.replace(/\D/g, "").slice(0, 12)); f.setErrors((err) => ({ ...err, ot: "" })); }}
                  disabled={f.motivo === "OT Inexistente"}
                  className={`${inputCls(!!f.errors.ot)} disabled:opacity-20`}
                  placeholder={f.motivo === "OT Inexistente" ? "No aplica" : "Ej: 0012300456"}
                  maxLength={12}
                />
                <FieldError msg={f.errors.ot} />
              </div>

              {f.splitOT && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                  <label className={labelCls}>
                    OT 2 <span className="text-accent-gold ml-1 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={f.ot2}
                    onChange={(e) => { f.setOt2(e.target.value.replace(/\D/g, "").slice(0, 10)); f.setErrors((err) => ({ ...err, ot2: "" })); }}
                    disabled={f.motivo2 === "OT Inexistente"}
                    className={`${inputCls(!!f.errors.ot2)} border-emerald-500/30 bg-emerald-500/5 disabled:opacity-20`}
                    placeholder="8-12 dígitos (2da OT)"
                    maxLength={12}
                  />
                  <FieldError msg={f.errors.ot2} />
                </motion.div>
              )}
            </div>
          </div>

          {/* ── Horario ─────────────────────────────────────────────────── */}
          <div>
            <label className={labelCls}>
              Horario de Fichaje <span className="text-accent-gold ml-1 font-bold">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-600 dark:text-slate-500 mb-1 uppercase tracking-widest ml-1">
                  Entrada
                </label>
                <input
                  type="time"
                  value={f.horarioDesde}
                  onChange={(e) => { f.setHorarioDesde(e.target.value); f.setErrors((err) => ({ ...err, horarioDesde: "" })); }}
                  className={`w-full bg-background border rounded-xl px-4 py-3 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] ${f.errors.horarioDesde ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                />
                <FieldError msg={f.errors.horarioDesde} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-600 dark:text-slate-500 mb-1 uppercase tracking-widest ml-1">
                  Salida
                </label>
                <input
                  type="time"
                  value={f.horarioHasta}
                  onChange={(e) => { f.setHorarioHasta(e.target.value); f.setErrors((err) => ({ ...err, horarioHasta: "" })); }}
                  className={`w-full bg-background border rounded-xl px-4 py-3 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] ${f.errors.horarioHasta ? "border-red-500/50 bg-red-500/5" : "border-border"}`}
                />
                <FieldError msg={f.errors.horarioHasta} />
              </div>
            </div>
          </div>

          {/* ── Horas detalle 1 ────────────────────────────────────────────── */}
          <div className={f.splitOT ? "p-4 bg-slate-500/5 rounded-3xl border border-border" : ""}>
            {f.splitOT && <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">Horas para OT 1</p>}
            <HorasDetalle
              horasNormales={f.horasNormales}       setHorasNormales={f.setHorasNormales}
              hsNormalesMods={f.hsNormalesMods}     setHsNormalesMods={f.setHsNormalesMods}
              horas50={f.horas50}                   setHoras50={f.setHoras50}
              hs50Mods={f.hs50Mods}                 setHs50Mods={f.setHs50Mods}
              horas100={f.horas100}                 setHoras100={f.setHoras100}
              hs100Mods={f.hs100Mods}               setHs100Mods={f.setHs100Mods}
            />
          </div>

          {/* ── Horas detalle 2 ────────────────────────────────────────────── */}
          {f.splitOT && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 ml-1">Horas para OT 2</p>
              <HorasDetalle
                horasNormales={f.horasNormales2}      setHorasNormales={f.setHorasNormales2}
                hsNormalesMods={f.hsNormalesMods}     setHsNormalesMods={f.setHsNormalesMods}
                horas50={f.horas502}                  setHoras50={f.setHoras502}
                hs50Mods={f.hs50Mods}                 setHs50Mods={f.setHs50Mods}
                horas100={f.horas1002}                setHoras100={f.setHoras1002}
                hs100Mods={f.hs100Mods}               setHs100Mods={f.setHs100Mods}
                isSecondary
              />
            </motion.div>
          )}

          {/* ── Notas ───────────────────────────────────────────────────── */}
          <div className="pt-2 border-t border-border">
            <label className="block text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">
              Notas adicionales
            </label>
            <textarea
              value={f.notas}
              onChange={(e) => f.setNotas(e.target.value)}
              rows={3}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition resize-none text-sm text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-700 font-medium"
              placeholder="Algún comentario sobre el error..."
            />
          </div>

          {/* ── Actions ─────────────────────────────────────────────────── */}
          <div className="pt-6 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={() => f.router.push("/")}
              className="px-6 py-3.5 rounded-2xl border border-border text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground transition-all active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={f.loading}
              className="min-w-[200px] bg-gradient-to-r from-accent-gold to-accent-gold-dark hover:shadow-[0_8px_30px_rgba(217,119,6,0.2)] text-black font-black py-4 px-8 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 active:scale-[0.98] text-[11px] uppercase tracking-widest"
            >
              {f.loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    Guardar{" "}
                    {f.selectedEmpleados.length > 1
                      ? `(${f.selectedEmpleados.length})`
                      : "Registro"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Recent entries section ────────────────────────────────────── */}
      <div className="mt-12 mb-20">
        <div className="flex items-center gap-3 mb-6 px-1">
          <div className="bg-accent-gold/10 p-2 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-accent-gold" />
          </div>
          <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Cargados Recientemente</h2>
        </div>

        <div className="space-y-3">
          {loadingRecent ? (
            <div className="bg-card/20 rounded-3xl p-8 border border-border flex flex-col items-center gap-4">
               <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Buscando historial...</p>
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="bg-card/20 rounded-3xl p-8 border border-border text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No hay registros recientes.</p>
            </div>
          ) : (
            recentEntries.map((err) => (
              <motion.div
                key={err.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card/30 hover:bg-card/50 border border-border hover:border-accent-gold/20 rounded-2xl p-4 flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center font-black text-slate-500 text-xs shadow-inner uppercase">
                    {err.nombre_apellido.slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-foreground uppercase tracking-tight">{err.nombre_apellido}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black text-accent-gold uppercase tracking-widest">{err.motivo_error}</span>
                      <span className="text-slate-400 text-[10px]">·</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{format(new Date(err.fecha), 'dd MMM', { locale: es })}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                   <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">OT: {err.ot || '---'}</div>
                   <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">{err.sector}</div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
