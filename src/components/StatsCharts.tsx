"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, subDays, isSameDay, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { ErrorCarga, MOTIVO_COLORS } from "@/types";

interface StatsChartsProps {
  data: ErrorCarga[];
}

const COLORS = [
  "#d97706", // amber-600
  "#f59e0b", // amber-500
  "#fbbf24", // amber-400
  "#fcd34d", // amber-300
  "#ea580c", // orange-600
  "#f97316", // orange-500
];

export function StatsCharts({ data }: StatsChartsProps) {
  // ... (useMemo logic stays the same)
  // 1. Data for Daily Chart (Last 14 days) - Normalized to string comparison
  const dailyData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      return {
        key: format(date, "yyyy-MM-dd"),
        name: format(date, "dd/MM"),
        total: 0,
      };
    });

    data.forEach((err) => {
      const errDateKey = format(parseISO(err.fecha), "yyyy-MM-dd");
      const day = days.find((d) => d.key === errDateKey);
      if (day) day.total += 1;
    });

    return days;
  }, [data]);

  // 2. Data for Motives Chart
  const motivesData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((err) => {
      counts[err.motivo_error] = (counts[err.motivo_error] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // 3. Data for Top OTs
  const otData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((err) => {
      if (err.ot) {
        counts[err.ot] = (counts[err.ot] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: `OT ${name}`, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Daily Chart */}
      <div className="bg-slate-950/40 p-5 rounded-3xl border border-white/5 shadow-2xl flex flex-col hover:border-amber-500/20 transition-all duration-300 group">
        <h3 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.2em] group-hover:text-amber-500/50 transition-colors">Omisiones últimos 14 días</h3>
        <div className="h-[200px] w-full mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} dy={5} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
              <Tooltip 
                cursor={{ fill: 'rgba(251,191,36,0.05)', radius: 8 }}
                contentStyle={{ backgroundColor: '#0a0c10', borderRadius: '16px', border: '1px solid rgba(251,191,36,0.1)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.8)', fontSize: '11px', fontWeight: 'bold', color: '#f8fafc' }}
                itemStyle={{ color: '#fbbf24' }}
              />
              <Bar dataKey="total" fill="url(#colorTotal)" radius={[6, 6, 0, 0]} barSize={16}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top OTs Chart */}
      <div className="bg-slate-950/40 p-5 rounded-3xl border border-white/5 shadow-2xl flex flex-col hover:border-amber-500/20 transition-all duration-300 group">
        <h3 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.2em] group-hover:text-amber-500/50 transition-colors">Top 5 OTs con más omisiones</h3>
        <div className="h-[200px] w-full mt-auto">
          {otData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={otData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.02)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: '600' }} width={80} />
                <Tooltip 
                  cursor={{ fill: 'rgba(251,191,36,0.05)', radius: 8 }}
                  contentStyle={{ backgroundColor: '#0a0c10', borderRadius: '16px', border: '1px solid rgba(251,191,36,0.1)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.8)', fontSize: '11px', fontWeight: 'bold', color: '#f8fafc' }}
                  itemStyle={{ color: '#fbbf24' }}
                />
                <Bar dataKey="value" fill="#fbbf24" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-600 text-[10px] font-black uppercase tracking-widest bg-black/20 rounded-2xl border border-dashed border-white/5">
              No hay datos de OTs
            </div>
          )}
        </div>
      </div>

      {/* Motives Chart */}
      <div className="bg-slate-950/40 p-5 rounded-3xl border border-white/5 shadow-2xl flex flex-col hover:border-amber-500/20 transition-all duration-300 group">
        <h3 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.2em] group-hover:text-amber-500/50 transition-colors">Distribución por Motivo</h3>
        <div className="h-[200px] w-full mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={motivesData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" animationBegin={0} animationDuration={1000} stroke="none">
                {motivesData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0c10', borderRadius: '16px', border: '1px solid rgba(251,191,36,0.1)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.8)', fontSize: '11px', fontWeight: 'bold', color: '#f8fafc' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', paddingTop: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
