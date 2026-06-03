import { SCRow } from "@/lib/processExcel";

interface SummaryPanelProps {
  rows: SCRow[];
  filterComprador: string;
  onFilterChange: (v: string) => void;
}

const COMPRADOR_COLORS: Record<string, { chip: string; dot: string }> = {
  DAYANE:  { chip: "bg-amber-100 text-amber-800 border-amber-300",   dot: "bg-amber-500" },
  JESSICA: { chip: "bg-green-100 text-green-800 border-green-300",   dot: "bg-green-500" },
  EDUARDA: { chip: "bg-rose-100 text-rose-800 border-rose-300",      dot: "bg-rose-500" },
  YASMIM:  { chip: "bg-yellow-100 text-yellow-800 border-yellow-300", dot: "bg-yellow-500" },
};

function getColors(name: string) {
  return COMPRADOR_COLORS[name?.toUpperCase()] ?? {
    chip: "bg-slate-100 text-slate-700 border-slate-300",
    dot: "bg-slate-400",
  };
}

export default function SummaryPanel({ rows, filterComprador, onFilterChange }: SummaryPanelProps) {
  const counts: Record<string, number> = {};
  let expiredCount = 0;

  for (const row of rows) {
    const key = row.comprador || "NÃO CLASSIFICADO";
    counts[key] = (counts[key] || 0) + 1;
    if (row.dataEmissao) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if ((now.getTime() - row.dataEmissao.getTime()) / 86400000 > 5) expiredCount++;
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1 shrink-0">
          Filtrar:
        </span>

        <button
          onClick={() => onFilterChange("")}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
            filterComprador === ""
              ? "bg-slate-800 text-white border-slate-800 shadow"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          Todos
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filterComprador === "" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
            {rows.length}
          </span>
        </button>

        {sorted.map(([name, count]) => {
          const key = name === "NÃO CLASSIFICADO" ? "__unclassified__" : name;
          const active = filterComprador === key;
          const { chip, dot } = name === "NÃO CLASSIFICADO"
            ? { chip: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" }
            : getColors(name);
          return (
            <button
              key={name}
              onClick={() => onFilterChange(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                active ? chip + " ring-2 ring-offset-1 ring-slate-400 shadow" : chip + " hover:opacity-80"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              {name}
              <span className="font-bold text-[10px] px-1.5 py-0.5 bg-white/60 rounded-full">
                {count}
              </span>
            </button>
          );
        })}

        {expiredCount > 0 && (
          <div className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border bg-red-50 text-red-700 border-red-200 shrink-0">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {expiredCount} vencida{expiredCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
