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
  "#3b82f6", // blue
  "#ef4444", // red
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#64748b", // slate
  "#10b981", // emerald
];

export function StatsCharts({ data }: StatsChartsProps) {
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
      // Normalize to local date string YYYY-MM-DD
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
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col hover:shadow-md transition-shadow duration-300">
        <h3 className="text-[10px] font-extrabold text-slate-400 mb-4 uppercase tracking-[0.2em]">Omisiones últimos 14 días</h3>
        <div className="h-[200px] w-full mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={5} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc', radius: 4 }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
              />
              <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top OTs Chart */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col hover:shadow-md transition-shadow duration-300">
        <h3 className="text-[10px] font-extrabold text-slate-400 mb-4 uppercase tracking-[0.2em]">Top 5 OTs con más omisiones</h3>
        <div className="h-[200px] w-full mt-auto">
          {otData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={otData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: '500' }} width={80} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 4 }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-[10px] font-bold uppercase tracking-widest bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              No hay datos de OTs
            </div>
          )}
        </div>
      </div>

      {/* Motives Chart */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col hover:shadow-md transition-shadow duration-300">
        <h3 className="text-[10px] font-extrabold text-slate-400 mb-4 uppercase tracking-[0.2em]">Distribución por Motivo</h3>
        <div className="h-[200px] w-full mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={motivesData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={8} dataKey="value" animationBegin={0} animationDuration={1000}>
                {motivesData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', paddingTop: '10px', fontWeight: '600' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
