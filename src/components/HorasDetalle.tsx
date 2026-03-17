"use client";

import type { HourMods } from "@/app/carga/useCargaForm";

interface HorasDetalleProps {
  horasNormales: string;
  setHorasNormales: (v: string) => void;
  hsNormalesMods: HourMods;
  setHsNormalesMods: (v: HourMods) => void;
  horas50: string;
  setHoras50: (v: string) => void;
  hs50Mods: HourMods;
  setHs50Mods: (v: HourMods) => void;
  horas100: string;
  setHoras100: (v: string) => void;
  hs100Mods: HourMods;
  setHs100Mods: (v: HourMods) => void;
}

const labelCls =
  "block text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-600 dark:text-slate-500 ml-1";

const inputCls =
  "w-full bg-background border border-border rounded-xl px-4 py-3 focus:ring-4 focus:ring-accent-gold/10 focus:border-accent-gold/50 outline-none transition text-sm font-black placeholder:text-slate-400 dark:placeholder:text-slate-700 text-foreground";

const MOD_KEYS: (keyof HourMods)[] = ["insa", "polu", "noct"];

function ModCheckboxes({
  mods,
  onChange,
}: {
  mods: HourMods;
  onChange: (v: HourMods) => void;
}) {
  return (
    <div className="flex gap-3 mt-2 flex-wrap">
      {MOD_KEYS.map((key) => (
        <label
          key={key}
          className="inline-flex items-center gap-1.5 cursor-pointer select-none"
        >
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={mods[key]}
              onChange={(e) => onChange({ ...mods, [key]: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-4 h-4 rounded border border-border bg-background peer-checked:bg-accent-gold peer-checked:border-accent-gold transition-all peer-focus:ring-2 peer-focus:ring-accent-gold/20 flex items-center justify-center">
              {mods[key] && (
                <svg
                  className="w-2.5 h-2.5 text-black stroke-[3px]"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                >
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500 peer-checked:text-accent-gold">
            {key.toUpperCase()}
          </span>
        </label>
      ))}
    </div>
  );
}

export function HorasDetalle({
  horasNormales,
  setHorasNormales,
  hsNormalesMods,
  setHsNormalesMods,
  horas50,
  setHoras50,
  hs50Mods,
  setHs50Mods,
  horas100,
  setHoras100,
  hs100Mods,
  setHs100Mods,
}: HorasDetalleProps) {
  return (
    <div className="pt-2 border-t border-border space-y-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:text-slate-500 ml-1">
        Detalle de Horas
      </p>

      {/* Horas Normales */}
      <div>
        <label className={labelCls}>Horas Normales</label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={horasNormales}
          onChange={(e) => setHorasNormales(e.target.value)}
          className={inputCls}
          placeholder="Ej: 8"
        />
        <ModCheckboxes mods={hsNormalesMods} onChange={setHsNormalesMods} />
      </div>

      {/* Horas 50% */}
      <div>
        <label className={labelCls}>Horas 50%</label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={horas50}
          onChange={(e) => setHoras50(e.target.value)}
          className={inputCls}
          placeholder="Ej: 2"
        />
        <ModCheckboxes mods={hs50Mods} onChange={setHs50Mods} />
      </div>

      {/* Horas 100% */}
      <div>
        <label className={labelCls}>Horas 100%</label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={horas100}
          onChange={(e) => setHoras100(e.target.value)}
          className={inputCls}
          placeholder="Ej: 4"
        />
        <ModCheckboxes mods={hs100Mods} onChange={setHs100Mods} />
      </div>
    </div>
  );
}
