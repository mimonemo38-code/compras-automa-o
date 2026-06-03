import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { KeywordRule, getAllGroups, getAllCompradores } from "@/lib/classify";

interface RulesPageProps {
  onBack: () => void;
}

const MATCH_LABELS: Record<string, string> = {
  contains: "Contém",
  startsWith: "Começa com",
  endsWith: "Termina com",
  codePrefix: "Prefixo de código",
};

async function apiGet(): Promise<KeywordRule[]> {
  const res = await fetch("/api/keyword-rules");
  if (!res.ok) throw new Error("Erro ao carregar regras");
  return res.json();
}

async function apiCreate(data: Omit<KeywordRule, "id">) {
  const res = await fetch("/api/keyword-rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao criar regra");
  return res.json();
}

async function apiDelete(id: number) {
  const res = await fetch(`/api/keyword-rules/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erro ao deletar regra");
}

async function apiUpdatePriority(id: number, priority: number) {
  const res = await fetch(`/api/keyword-rules/${id}/priority`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priority }),
  });
  if (!res.ok) throw new Error("Erro ao atualizar prioridade");
  return res.json();
}

export default function Rules({ onBack }: RulesPageProps) {
  const qc = useQueryClient();
  const allGroups = getAllGroups();
  const allCompradores = getAllCompradores();

  const [keyword, setKeyword] = useState("");
  const [compradora, setCompradora] = useState("");
  const [grupo, setGrupo] = useState("");
  const [matchType, setMatchType] = useState<KeywordRule["matchType"]>("contains");

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["keyword-rules"],
    queryFn: apiGet,
  });

  const createMutation = useMutation({
    mutationFn: apiCreate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keyword-rules"] });
      setKeyword("");
      setCompradora("");
      setGrupo("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiDelete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keyword-rules"] }),
  });

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: number; priority: number }) =>
      apiUpdatePriority(id, priority),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keyword-rules"] }),
  });

  function handleAdd() {
    if (!keyword.trim() || !compradora.trim()) return;
    const nextPriority = rules.length > 0 ? Math.max(...rules.map((r) => r.priority)) + 1 : 0;
    createMutation.mutate({
      keyword: keyword.trim(),
      compradora: compradora.trim().toUpperCase(),
      grupo: grupo.trim().toUpperCase(),
      matchType,
      priority: nextPriority,
    });
  }

  function handleMoveUp(idx: number) {
    if (idx === 0) return;
    const sorted = [...rules].sort((a, b) => a.priority - b.priority || a.id - b.id);
    const curr = sorted[idx];
    const prev = sorted[idx - 1];
    priorityMutation.mutate({ id: curr.id, priority: prev.priority });
    priorityMutation.mutate({ id: prev.id, priority: curr.priority });
  }

  function handleMoveDown(idx: number) {
    if (idx === rules.length - 1) return;
    const sorted = [...rules].sort((a, b) => a.priority - b.priority || a.id - b.id);
    const curr = sorted[idx];
    const next = sorted[idx + 1];
    priorityMutation.mutate({ id: curr.id, priority: next.priority });
    priorityMutation.mutate({ id: next.id, priority: curr.priority });
  }

  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority || a.id - b.id);

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
          <h1 className="text-sm font-bold">Regras de Palavras-Chave</h1>
          <p className="text-[11px] text-slate-400">
            Salvas no banco de dados — disponíveis em qualquer computador
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-900/40 px-2.5 py-1 rounded-full border border-emerald-700">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Banco de dados ativo
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-[11px] text-blue-800">
          <div className="font-semibold mb-1">Como funciona a classificação automática:</div>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li><strong>Base de materiais</strong> — 3.564 materiais com Grupo e Comprador já mapeados.</li>
            <li><strong>Regra do "13"</strong> — Código começando com <code className="bg-blue-100 px-1 rounded">13</code> → <strong>DAYANE</strong> (Assistência).</li>
            <li><strong>Palavras-chave abaixo</strong> — Aplicadas em ordem de prioridade (setas ↑↓).</li>
            <li><strong>Divisão de Carteira</strong> — Fallback pelo grupo do material.</li>
          </ol>
        </div>

        <div className="bg-white border border-border rounded-lg p-5 shadow-sm">
          <h2 className="text-[11px] font-bold text-slate-700 mb-4 uppercase tracking-wide">Adicionar nova regra</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Palavra-chave <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Ex: PARAFUSO, LUVA, CABO..."
                className="w-full px-3 py-1.5 text-[11px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Tipo de correspondência</label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as KeywordRule["matchType"])}
                className="w-full px-3 py-1.5 text-[11px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
              >
                <option value="contains">Contém</option>
                <option value="startsWith">Começa com</option>
                <option value="endsWith">Termina com</option>
                <option value="codePrefix">Prefixo de código (ex: 20.01.)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Compradora <span className="text-red-500">*</span>
              </label>
              <select
                value={compradora}
                onChange={(e) => setCompradora(e.target.value)}
                className="w-full px-3 py-1.5 text-[11px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
              >
                <option value="">Selecionar compradora...</option>
                {allCompradores.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Grupo (opcional)</label>
              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="w-full px-3 py-1.5 text-[11px] border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white"
              >
                <option value="">Sem grupo específico</option>
                {allGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleAdd}
              disabled={!keyword.trim() || !compradora.trim() || createMutation.isPending}
              className="px-4 py-1.5 bg-primary text-white text-[11px] font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Salvando...</>
              ) : (
                "＋ Adicionar Regra"
              )}
            </button>
            {createMutation.isSuccess && (
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                ✓ Salvo no banco de dados
              </span>
            )}
            {createMutation.isError && (
              <span className="text-[11px] text-red-600 font-semibold">
                ✕ Erro ao salvar
              </span>
            )}
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Regras configuradas
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Aplicadas em ordem de prioridade — use as setas para reordenar
              </p>
            </div>
            {!isLoading && (
              <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                {sortedRules.length} regra{sortedRules.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-[11px] text-slate-400">
              <span className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
              Carregando do banco de dados...
            </div>
          ) : sortedRules.length === 0 ? (
            <div className="text-center py-12 text-[11px] text-slate-400 flex flex-col items-center gap-2">
              <span className="text-3xl">🔑</span>
              <span>Nenhuma regra configurada ainda.</span>
              <span className="text-[10px]">Adicione uma acima para classificar materiais novos.</span>
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-100 border-b border-border">
                  <th className="px-3 py-2 text-left font-bold text-slate-500 w-8">#</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500">Palavra-chave</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500">Tipo</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500">Compradora</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-500">Grupo</th>
                  <th className="px-3 py-2 text-center font-bold text-slate-500 w-24">Ordem</th>
                  <th className="px-3 py-2 text-center font-bold text-slate-500 w-12">Del</th>
                </tr>
              </thead>
              <tbody>
                {sortedRules.map((rule, idx) => (
                  <tr
                    key={rule.id}
                    className={`border-b border-border transition-colors hover:bg-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="px-3 py-2 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{rule.keyword}</td>
                    <td className="px-3 py-2 text-slate-500">{MATCH_LABELS[rule.matchType]}</td>
                    <td className="px-3 py-2">
                      <span className="font-bold text-primary">{rule.compradora}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{rule.grupo || "—"}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0 || priorityMutation.isPending}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded disabled:opacity-25 transition-colors"
                          title="Aumentar prioridade"
                        >↑</button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === sortedRules.length - 1 || priorityMutation.isPending}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded disabled:opacity-25 transition-colors"
                          title="Diminuir prioridade"
                        >↓</button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => deleteMutation.mutate(rule.id)}
                        disabled={deleteMutation.isPending}
                        className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded mx-auto transition-colors disabled:opacity-40"
                        title="Remover regra"
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
