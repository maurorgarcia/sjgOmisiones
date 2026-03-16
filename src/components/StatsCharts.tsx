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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
        <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">Omisiones últimos 14 días</h3>
        <div className="h-[200px] w-full mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={5} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top OTs Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
        <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">Top 5 OTs con más omisiones</h3>
        <div className="h-[200px] w-full mt-auto">
          {otData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={otData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} width={80} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs italic">
              No hay datos de OTs
            </div>
          )}
        </div>
      </div>

      {/* Motives Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
        <h3 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest">Distribución por Motivo</h3>
        <div className="h-[200px] w-full mt-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={motivesData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                {motivesData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
