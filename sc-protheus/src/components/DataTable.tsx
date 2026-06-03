import { useState, useMemo, useRef, useEffect } from "react";
import { SCRow, formatDate, isDateExpired } from "@/lib/processExcel";

interface DataTableProps {
  rows: SCRow[];
  filterComprador: string;
  onRuleSaved?: () => void;
}

type SortKey = keyof SCRow | null;

const SOURCE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  base:          { bg: "bg-emerald-100", text: "text-emerald-700", label: "Base" },
  rule13:        { bg: "bg-blue-100",    text: "text-blue-700",    label: "Reg.13" },
  keyword:       { bg: "bg-violet-100",  text: "text-violet-700",  label: "Kw" },
  codePrefix:    { bg: "bg-indigo-100",  text: "text-indigo-700",  label: "Prefixo" },
  portfolio:     { bg: "bg-cyan-100",    text: "text-cyan-700",    label: "Carteira" },
  unclassified:  { bg: "bg-amber-100",   text: "text-amber-700",   label: "?" },
};

const COMPRADOR_COLORS: Record<string, string> = {
  YASMIM:  "bg-violet-50 text-violet-800 border-violet-200",
  VALERIA: "bg-pink-50 text-pink-800 border-pink-200",
  JESSICA: "bg-teal-50 text-teal-800 border-teal-200",
  EDUARDA: "bg-orange-50 text-orange-800 border-orange-200",
  DAY:     "bg-sky-50 text-sky-800 border-sky-200",
  DAYANE:  "bg-sky-50 text-sky-800 border-sky-200",
};

const ALL_COMPRADORES = ["DAYANE", "JESSICA", "EDUARDA", "YASMIM"];

function compradorClass(name: string) {
  return COMPRADOR_COLORS[name?.toUpperCase()] ?? "bg-slate-100 text-slate-700 border-slate-200";
}

function rowKey(row: SCRow) {
  return `${row.numeroSC}-${row.itemSC}-${row.produto}`;
}

function suggestKeyword(descricao: string): string {
  return descricao.trim().split(/\s+/).slice(0, 4).join(" ");
}

interface RuleModal {
  key: string;
  descricao: string;
  compradora: string;
  keyword: string;
  grupo: string;
}

export default function DataTable({ rows, filterComprador, onRuleSaved }: DataTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");

  // Inline corrections: rowKey → compradora override
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [ruleModal, setRuleModal] = useState<RuleModal | null>(null);
  const [modalKeyword, setModalKeyword] = useState("");
  const [modalGrupo, setModalGrupo] = useState("");
  const [savingRule, setSavingRule] = useState(false);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState(false);
  const editRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editingKey && editRef.current) editRef.current.focus();
  }, [editingKey]);

  useEffect(() => {
    if (ruleModal) {
      setModalKeyword(ruleModal.keyword);
      setModalGrupo(ruleModal.grupo);
    }
  }, [ruleModal]);

  // Close edit on outside click
  useEffect(() => {
    if (!editingKey) return;
    function handler(e: MouseEvent) {
      if (!(e.target as Element).closest("[data-comprador-edit]")) {
        setEditingKey(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editingKey]);

  function handleCompradorClick(key: string) {
    setEditingKey(key);
  }

  function handleCompradorChange(row: SCRow, key: string, newCompradora: string) {
    const currentCompradora = corrections[key] ?? row.comprador;
    if (newCompradora === currentCompradora) {
      setEditingKey(null);
      return;
    }
    setCorrections((prev) => ({ ...prev, [key]: newCompradora }));
    setEditingKey(null);
    setRuleModal({
      key,
      descricao: row.descricao,
      compradora: newCompradora,
      keyword: suggestKeyword(row.descricao),
      grupo: row.grupo ?? "",
    });
    setSaveError(false);
  }

  async function handleSaveRule() {
    if (!ruleModal || !modalKeyword.trim()) return;
    setSavingRule(true);
    setSaveError(false);
    try {
      const res = await fetch("/api/keyword-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: modalKeyword.trim().toUpperCase(),
          compradora: ruleModal.compradora,
          grupo: modalGrupo.trim().toUpperCase(),
          matchType: "startsWith",
          priority: -50,
        }),
      });
      if (!res.ok) throw new Error("erro");
      setSavedKeys((prev) => new Set([...prev, ruleModal.key]));
      setRuleModal(null);
      onRuleSaved?.();
    } catch {
      setSaveError(true);
    } finally {
      setSavingRule(false);
    }
  }

  const filtered = useMemo(() => {
    let r = rows;
    if (filterComprador === "__unclassified__") {
      r = r.filter((row) => {
        const k = rowKey(row);
        const comp = corrections[k] ?? row.comprador;
        return !comp;
      });
    } else if (filterComprador) {
      r = r.filter((row) => {
        const k = rowKey(row);
        const comp = corrections[k] ?? row.comprador;
        return comp === filterComprador;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (row) =>
          row.numeroSC.toLowerCase().includes(q) ||
          row.produto.toLowerCase().includes(q) ||
          row.descricao.toLowerCase().includes(q) ||
          row.solicitante.toLowerCase().includes(q) ||
          (corrections[rowKey(row)] ?? row.comprador).toLowerCase().includes(q) ||
          row.grupo.toLowerCase().includes(q)
      );
    }
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        if (av instanceof Date && bv instanceof Date) {
          return sortDir === "asc" ? av.getTime() - bv.getTime() : bv.getTime() - av.getTime();
        }
        const cmp = String(av).toLowerCase().localeCompare(String(bv).toLowerCase(), "pt-BR");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return r;
  }, [rows, filterComprador, search, sortKey, sortDir, corrections]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const Th = ({ label, col, align = "left" }: { label: string; col: SortKey; align?: string }) => (
    <th
      onClick={() => col && handleSort(col)}
      className={`px-3 py-2.5 text-${align} text-[11px] font-bold text-white select-none whitespace-nowrap border-r border-slate-600 last:border-r-0 ${col ? "cursor-pointer hover:bg-slate-600 active:bg-slate-500" : ""}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {col && (
          <span className={`text-[10px] ${sortKey === col ? "text-blue-300" : "text-slate-500"}`}>
            {sortKey === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
          </span>
        )}
      </span>
    </th>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Save-as-rule modal */}
      {ruleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-5 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">💡</span>
              <h3 className="text-[12px] font-bold text-slate-800">Criar regra automática?</h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">
              Descrições que <strong>começam com</strong> esse texto serão classificadas automaticamente como <strong className="text-primary">{ruleModal.compradora}</strong>.
            </p>
            <div className="mb-3">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Palavra-chave (descrição começa com)
              </label>
              <input
                type="text"
                value={modalKeyword}
                onChange={(e) => setModalKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveRule()}
                className="w-full px-3 py-1.5 text-[11px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                autoFocus
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Original: "{ruleModal.descricao.substring(0, 60)}{ruleModal.descricao.length > 60 ? "…" : ""}"
              </p>
            </div>
            <div className="mb-3">
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Grupo do material <span className="text-slate-400 font-normal normal-case">(opcional)</span>
              </label>
              <input
                type="text"
                value={modalGrupo}
                onChange={(e) => setModalGrupo(e.target.value)}
                placeholder="Ex: FERRAGEM, GN, MANUTENCAO..."
                className="w-full px-3 py-1.5 text-[11px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-slate-300"
              />
            </div>
            {saveError && (
              <p className="text-[11px] text-red-600 mb-2">✕ Erro ao salvar. Tente novamente.</p>
            )}
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setRuleModal(null)}
                className="px-3 py-1.5 text-[11px] text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Só corrigir (sem regra)
              </button>
              <button
                onClick={handleSaveRule}
                disabled={!modalKeyword.trim() || savingRule}
                className="px-4 py-1.5 bg-primary text-white text-[11px] font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {savingRule ? (
                  <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Salvando...</>
                ) : (
                  "✓ Salvar Regra"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por SC, produto, descrição, solicitante, comprador..."
            className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 placeholder:text-slate-400 transition-all"
          />
        </div>
        <div className="text-[11px] text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap font-medium">
          {filtered.length} <span className="text-slate-400">/{rows.length}</span>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 shadow-md">
        <table className="w-full border-collapse" style={{ minWidth: 980, fontSize: 11 }}>
          <thead>
            <tr className="bg-slate-800 sticky top-0 z-10">
              <Th label="Numero SC"    col="numeroSC"   />
              <Th label="Item"         col="itemSC"     align="center" />
              <Th label="Qtd"          col="quantidade" align="right" />
              <Th label="UM"           col="um"         align="center" />
              <Th label="Produto"      col="produto"    />
              <Th label="Descrição"    col="descricao"  />
              <Th label="Tp"           col="tp"         align="center" />
              <Th label="Grupo"        col="grupo"      />
              <Th label="Dt. Emissão"  col="dataEmissao"/>
              <Th label="Solicitante"  col="solicitante"/>
              <Th label="Comprador"    col={null}       />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-16 text-slate-400 bg-white text-[11px]">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">🔍</span>
                    <span>Nenhuma linha encontrada</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => {
                const key = rowKey(row);
                const comprador = corrections[key] ?? row.comprador;
                const isCorrected = key in corrections;
                const expired = isDateExpired(row.dataEmissao, 5);
                const isEven = idx % 2 === 0;
                const badge = SOURCE_BADGE[isCorrected ? "keyword" : row.classificacaoSource];
                const isEditing = editingKey === key;
                const wasRuleSaved = savedKeys.has(key);
                return (
                  <tr
                    key={idx}
                    className={`border-b border-slate-100 transition-colors group ${
                      expired
                        ? isEven ? "bg-red-50 hover:bg-red-100" : "bg-red-50/80 hover:bg-red-100"
                        : isEven ? "bg-white hover:bg-blue-50/60" : "bg-slate-50/70 hover:bg-blue-50/60"
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap border-r border-slate-100">
                      <span className="font-bold text-blue-700 tracking-tight">{row.numeroSC}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap border-r border-slate-100">
                      {row.itemSC}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 font-medium whitespace-nowrap border-r border-slate-100">
                      {row.quantidade}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap border-r border-slate-100">
                      {row.um}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap border-r border-slate-100">
                      <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {row.produto}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-slate-100" style={{ maxWidth: 320 }}>
                      <span className="text-slate-800 leading-snug" title={row.descricao}>
                        {row.descricao}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap border-r border-slate-100">
                      {row.tp}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap border-r border-slate-100">
                      <span className="text-slate-600 text-[10px] font-medium">{row.grupo}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap border-r border-slate-100">
                      {expired ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-red-600">{formatDate(row.dataEmissao)}</span>
                          <span className="inline-flex items-center bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                            VENCIDA
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-700">{formatDate(row.dataEmissao)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap border-r border-slate-100">
                      {row.solicitante}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" data-comprador-edit>
                      {isEditing ? (
                        <select
                          ref={editRef}
                          data-comprador-edit
                          value={comprador || ""}
                          onChange={(e) => handleCompradorChange(row, key, e.target.value)}
                          className="text-[11px] border border-primary rounded-md px-1.5 py-0.5 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-semibold"
                          autoFocus
                        >
                          <option value="">Não classif.</option>
                          {ALL_COMPRADORES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      ) : comprador ? (
                        <div
                          className="flex items-center gap-1.5 cursor-pointer group/comp"
                          onClick={() => handleCompradorClick(key)}
                          title="Clique para corrigir"
                        >
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all group-hover/comp:ring-2 group-hover/comp:ring-primary/30 ${compradorClass(comprador)} ${isCorrected ? "ring-1 ring-amber-400" : ""}`}>
                            {comprador}
                            {isCorrected && <span className="ml-1 text-[8px] text-amber-600">✎</span>}
                          </span>
                          {wasRuleSaved ? (
                            <span className="inline-flex items-center text-[9px] font-semibold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">
                              ✓ Regra
                            </span>
                          ) : (
                            <span className={`inline-flex items-center text-[9px] font-semibold px-1 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-200 transition-colors"
                          onClick={() => handleCompradorClick(key)}
                          title="Clique para classificar"
                        >
                          ⚠ Não classif.
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
