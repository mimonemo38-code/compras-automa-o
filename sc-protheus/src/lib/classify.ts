import classificationData from "../data/classification.json";
import { getCompradoraByGrupo } from "../data/portfolio";

export interface ClassificationEntry {
  codigo: string;
  grupo: string;
  compradora: string;
}

export interface KeywordRule {
  id: number;
  keyword: string;
  compradora: string;
  grupo: string;
  matchType: "contains" | "startsWith" | "endsWith" | "codePrefix";
  priority: number;
}

export interface ClassificationResult {
  grupo: string;
  compradora: string;
  source: "base" | "rule13" | "keyword" | "codePrefix" | "portfolio" | "unclassified";
}

const classificationMap = new Map<string, ClassificationEntry>();
(classificationData as ClassificationEntry[]).forEach((entry) => {
  classificationMap.set(entry.codigo.toLowerCase().trim(), entry);
});

/**
 * Resolve compradora a partir do grupo e do valor raw do JSON.
 * A CARTEIRA (portfolio) é sempre a fonte autoritativa.
 */
function resolveCompradora(raw: string, grupo: string): string {
  const fromPortfolio = getCompradoraByGrupo(grupo);
  if (fromPortfolio) return fromPortfolio;

  const up = raw.toUpperCase().trim();
  if (up === "VALERIA" || up === "TESTE" || up === "") return "";
  if (up === "DAY") return "DAYANE";
  return up;
}

export async function fetchKeywordRules(): Promise<KeywordRule[]> {
  try {
    const res = await fetch("/api/keyword-rules", { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

/**
 * Ordena as regras por especificidade:
 *   1. startsWith  — mais específico (match no início)
 *   2. codePrefix  — match no código do produto
 *   3. contains    — mais genérico (qualquer posição)
 *   4. endsWith    — match no final
 * Dentro de cada tipo, ordena por prioridade (menor número = maior prioridade).
 * Isso garante que uma regra criada pelo usuário (startsWith) nunca perca
 * para uma regra genérica de contains, independente do número de prioridade.
 */
function sortRulesBySpecificity(rules: KeywordRule[]): KeywordRule[] {
  const order: Record<KeywordRule["matchType"], number> = {
    startsWith: 0,
    codePrefix: 1,
    contains: 2,
    endsWith: 3,
  };
  return [...rules].sort((a, b) => {
    const typeOrder = order[a.matchType] - order[b.matchType];
    if (typeOrder !== 0) return typeOrder;
    return a.priority - b.priority || a.id - b.id;
  });
}

export function classify(
  produto: string,
  descricao: string,
  keywordRules: KeywordRule[]
): ClassificationResult {
  const code = produto.toLowerCase().trim();
  const entry = classificationMap.get(code);

  // 1. Regra do "13" → DAYANE (SEMPRE tem prioridade, mesmo que o item
  //    esteja na base com outro grupo — código começando com 13 é Assistência)
  if (code.startsWith("13")) {
    return {
      grupo: entry?.grupo || "ASSISTENCIA",
      compradora: "DAYANE",
      source: "rule13",
    };
  }

  // 2. Base de materiais (compradora resolvida pela carteira)
  if (entry) {
    const compradora = resolveCompradora(entry.compradora, entry.grupo);
    if (compradora) {
      return { grupo: entry.grupo, compradora, source: "base" };
    }
  }

  // 3. Palavras-chave configuradas (banco de dados).
  //    Ordenadas por especificidade: startsWith → codePrefix → contains → endsWith
  //    Dentro de cada tipo: menor priority = verificada primeiro.
  const descUpper = descricao.toUpperCase().trim();
  const sorted = sortRulesBySpecificity(keywordRules);

  for (const rule of sorted) {
    const kw = rule.keyword.toUpperCase().trim();
    let match = false;
    if (rule.matchType === "codePrefix") {
      match = code.startsWith(kw.toLowerCase());
    } else if (rule.matchType === "contains") {
      match = descUpper.includes(kw);
    } else if (rule.matchType === "startsWith") {
      match = descUpper.startsWith(kw);
    } else if (rule.matchType === "endsWith") {
      match = descUpper.endsWith(kw);
    }
    if (match) {
      const source = rule.matchType === "codePrefix" ? "codePrefix" : "keyword";
      return {
        grupo: rule.grupo || entry?.grupo || "",
        compradora: rule.compradora,
        source,
      };
    }
  }

  // 4. Fallback: grupo do material → carteira
  if (entry?.grupo) {
    const compradora = getCompradoraByGrupo(entry.grupo);
    if (compradora) {
      return { grupo: entry.grupo, compradora, source: "portfolio" };
    }
  }

  return { grupo: entry?.grupo || "", compradora: "", source: "unclassified" };
}

export function getAllGroups(): string[] {
  const groups = new Set<string>();
  (classificationData as ClassificationEntry[]).forEach((e) => {
    if (e.grupo) groups.add(e.grupo);
  });
  return Array.from(groups).sort();
}

export function getAllCompradores(): string[] {
  return ["DAYANE", "JESSICA", "EDUARDA", "YASMIM"];
}
