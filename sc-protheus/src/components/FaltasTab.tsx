import { useMemo } from "react";
import { SCRow, formatDate } from "@/lib/processExcel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";

interface FaltasTabProps {
  rows: SCRow[];
}

const COMPRADORES = ["DAYANE", "JESSICA", "EDUARDA", "YASMIM"] as const;

const COLORS: Record<string, { bar: string; light: string; border: string; text: string; dot: string }> = {
  DAYANE:  { bar: "#0ea5e9", light: "#f0f9ff", border: "#bae6fd", text: "#0369a1", dot: "#0ea5e9" },
  JESSICA: { bar: "#14b8a6", light: "#f0fdfa", border: "#99f6e4", text: "#0f766e", dot: "#14b8a6" },
  EDUARDA: { bar: "#f97316", light: "#fff7ed", border: "#fed7aa", text: "#c2410c", dot: "#f97316" },
  YASMIM:  { bar: "#a855f7", light: "#faf5ff", border: "#e9d5ff", text: "#7e22ce", dot: "#a855f7" },
};

const AGE_RANGES = [
  { key: "d5_10",  label: "5–10 dias",  color: "#fb923c" },
  { key: "d11_20", label: "11–20 dias", color: "#ef4444" },
  { key: "d21p",   label: "21+ dias",   color: "#7f1d1d" },
];

function calcDaysOverdue(date: Date | null): number {
  if (!date) return 0;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - date.getTime()) / 86400000);
}

export default function FaltasTab({ rows }: FaltasTabProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Rows with days overdue
  const enriched = useMemo(() =>
    rows.map(r => ({ ...r, daysOverdue: calcDaysOverdue(r.dataEmissao) })),
    [rows]
  );

  const overdueRows = useMemo(() =>
    enriched.filter(r => r.daysOverdue > 5),
    [enriched]
  );

  // Stats per compradora
  const stats = useMemo(() => {
    return COMPRADORES.map(comp => {
      const mine = enriched.filter(r => r.comprador === comp);
      const overdue = mine.filter(r => r.daysOverdue > 5);
      const d5_10 = overdue.filter(r => r.daysOverdue <= 10).length;
      const d11_20 = overdue.filter(r => r.daysOverdue > 10 && r.daysOverdue <= 20).length;
      const d21p = overdue.filter(r => r.daysOverdue > 20).length;
      return { comp, total: mine.length, overdue: overdue.length, d5_10, d11_20, d21p };
    });
  }, [enriched]);

  // Top overdue items
  const topOverdue = useMemo(() =>
    [...overdueRows].sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 20),
    [overdueRows]
  );

  // Pie chart data (overdue by compradora)
  const pieData = useMemo(() =>
    stats.filter(s => s.overdue > 0).map(s => ({ name: s.comp, value: s.overdue })),
    [stats]
  );

  const totalOverdue = overdueRows.length;

  return (
    <div className="flex flex-col gap-4">
      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(({ comp, total, overdue, d21p }) => {
          const pct = total > 0 ? Math.round((overdue / total) * 100) : 0;
          const c = COLORS[comp];
          return (
            <div
              key={comp}
              className="rounded-xl border shadow-sm p-3.5 flex flex-col gap-2"
              style={{ background: c.light, borderColor: c.border }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.dot }} />
                  <span className="text-[11px] font-bold" style={{ color: c.text }}>{comp}</span>
                </div>
                {d21p > 0 && (
                  <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded-full">
                    {d21p} crítico{d21p !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[22px] font-black leading-none" style={{ color: c.text }}>
                    {overdue}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    de {total} SC{total !== 1 ? "s" : ""} — {pct}% vencidas
                  </div>
                </div>
              </div>
              {/* Mini bar */}
              <div className="h-1.5 rounded-full bg-white/70 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: c.bar }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-5 gap-3">
        {/* Bar chart — aging breakdown per compradora */}
        <div className="col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[12px] font-bold text-slate-800">Faltas por compradora</h3>
              <p className="text-[10px] text-slate-400">Itens com data vencida ({">"} 5 dias), por faixa de atraso</p>
            </div>
            <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
              {totalOverdue} no total
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="comp" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                cursor={{ fill: "#f8fafc" }}
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              {AGE_RANGES.map(r => (
                <Bar key={r.key} dataKey={r.key} name={r.label} stackId="a" fill={r.color} radius={r.key === "d21p" ? [4, 4, 0, 0] : [0, 0, 0, 0]}>
                  {stats.map((s) => (
                    <Cell key={s.comp} fill={r.color} />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
          <h3 className="text-[12px] font-bold text-slate-800 mb-1">Distribuição de faltas</h3>
          <p className="text-[10px] text-slate-400 mb-2">Proporção por compradora</p>
          {totalOverdue === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl mb-1">✅</div>
                <p className="text-[11px] text-slate-500 font-medium">Nenhuma falta</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map(entry => (
                      <Cell key={entry.name} fill={COLORS[entry.name]?.bar ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    formatter={(v: number, n: string) => [`${v} SC${v !== 1 ? "s" : ""}`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1 text-[10px] text-slate-600">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[d.name]?.bar }} />
                    {d.name}: {d.value}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top overdue table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-[12px] font-bold text-slate-800">Itens mais atrasados</h3>
            <p className="text-[10px] text-slate-400">Ordenados por dias em atraso (maiores primeiro)</p>
          </div>
          {topOverdue.length === 0 && (
            <span className="text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold">
              ✓ Tudo em dia
            </span>
          )}
        </div>
        {topOverdue.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-[12px] font-semibold text-slate-600">Nenhum item vencido</p>
            <p className="text-[11px] text-slate-400 mt-1">Todos os itens estão dentro do prazo de 5 dias</p>
          </div>
        ) : (
          <table className="w-full border-collapse" style={{ fontSize: 11 }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">SC</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Produto</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide w-64">Descrição</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Emissão</th>
                <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Comprador</th>
                <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wide">Atraso</th>
              </tr>
            </thead>
            <tbody>
              {topOverdue.map((row, idx) => {
                const c = COLORS[row.comprador] ?? { light: "#f8fafc", text: "#475569", border: "#e2e8f0", dot: "#94a3b8" };
                const urgency = row.daysOverdue > 20 ? "bg-red-600" : row.daysOverdue > 10 ? "bg-orange-500" : "bg-amber-400";
                return (
                  <tr key={idx} className={`border-b border-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                    <td className="px-3 py-2 whitespace-nowrap font-bold text-blue-700">{row.numeroSC}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{row.produto}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 max-w-xs truncate" title={row.descricao}>{row.descricao}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">{formatDate(row.dataEmissao)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border"
                        style={{ background: c.light, borderColor: c.border, color: c.text }}
                      >
                        {row.comprador || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center justify-center text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${urgency}`}>
                        {row.daysOverdue}d
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
