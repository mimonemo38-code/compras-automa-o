import { DIVISAO_CARTEIRA } from "@/data/portfolio";

interface PortfolioPageProps {
  onBack: () => void;
}

const HEADER_COLORS: Record<string, string> = {
  DAYANE:  "bg-amber-400 text-amber-900",
  JESSICA: "bg-green-400 text-green-900",
  EDUARDA: "bg-rose-400 text-rose-900",
  YASMIM:  "bg-yellow-400 text-yellow-900",
};

export default function Portfolio({ onBack }: PortfolioPageProps) {
  const maxRows = Math.max(...DIVISAO_CARTEIRA.map((c) => c.grupos.length));

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-slate-800 text-white px-6 py-3 flex items-center gap-4 shadow-md">
        <button
          onClick={onBack}
          className="text-slate-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
        >
          ← Voltar
        </button>
        <div>
          <h1 className="text-sm font-bold">Divisão de Carteira</h1>
          <p className="text-[11px] text-slate-400">
            Grupos de materiais por compradora — atualizado após saída de VALERIA
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5 text-[11px] text-amber-800 flex items-start gap-2">
          <span className="mt-0.5 text-base">ℹ️</span>
          <div>
            <strong>VALERIA foi removida da empresa.</strong> Todos os materiais que eram dela foram
            redistribuídos automaticamente para as compradores abaixo com base na divisão de
            carteira vigente. A classificação já está atualizada no sistema.
          </div>
        </div>

        <div className="overflow-auto rounded-xl border border-slate-200 shadow-md">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                {DIVISAO_CARTEIRA.map((c) => (
                  <th
                    key={c.compradora}
                    className={`px-4 py-3 text-center font-bold text-sm border-r border-white/30 last:border-r-0 ${HEADER_COLORS[c.compradora] ?? "bg-slate-300 text-slate-800"}`}
                  >
                    {c.compradora}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, rowIdx) => (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  {DIVISAO_CARTEIRA.map((c) => {
                    const grupo = c.grupos[rowIdx];
                    const isHighlight =
                      c.compradora === "DAYANE" && grupo === "ASSISTENCIA TECNICA";
                    return (
                      <td
                        key={c.compradora}
                        className={`px-4 py-2 text-center border-r border-slate-100 last:border-r-0 font-medium ${
                          grupo
                            ? isHighlight
                              ? "text-amber-700 bg-amber-50"
                              : "text-slate-700"
                            : "text-transparent"
                        }`}
                      >
                        {grupo || "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-slate-400 mt-3 text-center">
          A tabela acima reflete a divisão oficial. Materiais cujo código não consta na base são
          classificados pelo grupo → compradora desta tabela.
        </p>
      </div>
    </div>
  );
}
