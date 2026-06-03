import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { classify, KeywordRule } from "./classify";

export interface SCRow {
  numeroSC: string;
  itemSC: string;
  quantidade: number | string;
  um: string;
  produto: string;
  descricao: string;
  tp: string;
  grupo: string;
  dataEmissao: Date | null;
  dataEmissaoSerial: number | null;
  solicitante: string;
  comprador: string;
  classificacaoSource: "base" | "rule13" | "keyword" | "codePrefix" | "portfolio" | "unclassified";
}

function excelDateToJS(serial: number): Date {
  const date = XLSX.SSF.parse_date_code(serial);
  return new Date(date.y, date.m - 1, date.d);
}

export async function processFile(
  file: File,
  keywordRules: KeywordRule[]
): Promise<{ rows: SCRow[]; errors: string[] }> {
  const errors: string[] = [];

  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

  if (raw.length < 2) {
    return { rows: [], errors: ["Arquivo inválido: não possui dados suficientes."] };
  }

  const headers = (raw[1] as unknown[]).map((h) =>
    String(h ?? "")
      .toLowerCase()
      .trim()
  );

  const rows: SCRow[] = [];

  for (let i = 2; i < raw.length; i++) {
    const rawRow = raw[i] as unknown[];
    if (!rawRow || rawRow.every((c) => c === null || c === undefined || c === "")) {
      continue;
    }

    const get = (colName: string): string => {
      const idx = headers.findIndex((h) => h === colName.toLowerCase());
      if (idx === -1) return "";
      const val = rawRow[idx];
      return String(val ?? "").trim();
    };

    const getRaw = (colName: string): unknown => {
      const idx = headers.findIndex((h) => h === colName.toLowerCase());
      if (idx === -1) return null;
      return rawRow[idx];
    };

    const produto = get("produto");
    const descricao = get("descricao") || get("descrição");
    const result = classify(produto, descricao, keywordRules);

    let dataEmissao: Date | null = null;
    let dataEmissaoSerial: number | null = null;
    const rawDate = getRaw("data de emissao") || getRaw("data de emissão");
    if (rawDate !== null && rawDate !== undefined && rawDate !== "") {
      const num = Number(rawDate);
      if (!isNaN(num) && num > 0) {
        dataEmissaoSerial = num;
        dataEmissao = excelDateToJS(num);
      }
    }

    rows.push({
      numeroSC: get("numero sc"),
      itemSC: get("item sc"),
      quantidade: get("quantidade"),
      um: get("um"),
      produto,
      descricao,
      tp: get("tp"),
      grupo: result.grupo,
      dataEmissao,
      dataEmissaoSerial,
      solicitante: get("solicitante"),
      comprador: result.compradora,
      classificacaoSource: result.source,
    });
  }

  if (rows.length === 0) {
    errors.push("Nenhuma linha de dados encontrada no arquivo.");
  }

  return { rows, errors };
}

export function formatDate(date: Date | null): string {
  if (!date) return "";
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function isDateExpired(date: Date | null, days = 5): boolean {
  if (!date) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > days;
}

export async function exportToExcel(rows: SCRow[], filename = "SC_Processada.xlsx"): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SC Protheus";
  const ws = wb.addWorksheet("SC Processada");

  const columns = [
    { header: "Numero SC",       key: "numeroSC",   width: 13 },
    { header: "Item SC",         key: "itemSC",     width: 9  },
    { header: "Quantidade",      key: "quantidade", width: 12 },
    { header: "UM",              key: "um",         width: 7  },
    { header: "Produto",         key: "produto",    width: 18 },
    { header: "Descrição",       key: "descricao",  width: 48 },
    { header: "Tp",              key: "tp",         width: 6  },
    { header: "Grupo",           key: "grupo",      width: 20 },
    { header: "Data de Emissão", key: "data",       width: 16 },
    { header: "Solicitante",     key: "solicitante",width: 24 },
    { header: "Comprador",       key: "comprador",  width: 15 },
  ];

  ws.columns = columns;

  const headerRow = ws.getRow(1);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    cell.border = {
      top: { style: "thin", color: { argb: "FF2D5A8E" } },
      bottom: { style: "thin", color: { argb: "FF2D5A8E" } },
      left: { style: "thin", color: { argb: "FF2D5A8E" } },
      right: { style: "thin", color: { argb: "FF2D5A8E" } },
    };
  });
  headerRow.height = 20;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  rows.forEach((row, rowIdx) => {
    const expired = isDateExpired(row.dataEmissao, 5);
    const isEven = rowIdx % 2 === 0;
    const bgColor = isEven ? "FFFFFFFF" : "FFF5F7FA";

    const values = [
      row.numeroSC,
      row.itemSC,
      row.quantidade,
      row.um,
      row.produto,
      row.descricao,
      row.tp,
      row.grupo,
      row.dataEmissao ? formatDate(row.dataEmissao) : "",
      row.solicitante,
      row.comprador,
    ];

    const excelRow = ws.addRow(values);
    excelRow.height = 16;

    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = {
        size: 11,
        color: colNumber === 9 && expired ? { argb: "FFDC2626" } : { argb: "FF1E293B" },
        bold: colNumber === 9 && expired,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: colNumber === 9 && expired ? "FFFFF0F0" : bgColor },
      };
      cell.alignment = { vertical: "middle", wrapText: false };
      cell.border = {
        top: { style: "hair", color: { argb: "FFE2E8F0" } },
        bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
        left: { style: "hair", color: { argb: "FFE2E8F0" } },
        right: { style: "hair", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: "A1", to: "K1" };

  // ── Segunda aba: Faltas ────────────────────────────────────────────────────
  const wf = wb.addWorksheet("Faltas");

  const now2 = new Date();
  now2.setHours(0, 0, 0, 0);
  function daysOverdue(date: Date | null): number {
    if (!date) return 0;
    return Math.max(0, Math.floor((now2.getTime() - date.getTime()) / 86400000));
  }

  const COMPRADORES = ["DAYANE", "JESSICA", "EDUARDA", "YASMIM"];
  const COMP_COLORS: Record<string, string> = {
    DAYANE: "FF0EA5E9", JESSICA: "FF14B8A6", EDUARDA: "FFF97316", YASMIM: "FFA855F7",
  };

  // ── Título ──
  const titleCell = wf.getCell("A1");
  titleCell.value = `Análise de Faltas — ${formatDate(new Date())}`;
  titleCell.font = { bold: true, size: 13, color: { argb: "FF1E293B" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  wf.mergeCells("A1:H1");
  wf.getRow(1).height = 22;

  // ── Subtítulo ──
  const subCell = wf.getCell("A2");
  subCell.value = "Itens com data de emissão há mais de 5 dias sem compra realizada";
  subCell.font = { size: 10, color: { argb: "FF64748B" }, italic: true };
  wf.mergeCells("A2:H2");
  wf.getRow(2).height = 16;

  // ── Resumo por compradora ──
  const sumHeaders = ["Compradora", "Total SCs", "Vencidas (>5d)", "Críticas (>20d)", "% Vencida"];
  const sumHeaderRow = wf.getRow(4);
  sumHeaders.forEach((h, i) => {
    const cell = sumHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF475569" } } };
  });
  sumHeaderRow.height = 18;

  COMPRADORES.forEach((comp, i) => {
    const mine = rows.filter(r => r.comprador === comp);
    const overdue = mine.filter(r => daysOverdue(r.dataEmissao) > 5);
    const critical = overdue.filter(r => daysOverdue(r.dataEmissao) > 20);
    const pct = mine.length > 0 ? `${Math.round((overdue.length / mine.length) * 100)}%` : "0%";
    const r = wf.getRow(5 + i);
    r.height = 17;
    const argb = COMP_COLORS[comp] ?? "FF94A3B8";
    const vals = [comp, mine.length, overdue.length, critical.length, pct];
    vals.forEach((v, ci) => {
      const cell = r.getCell(ci + 1);
      cell.value = v;
      cell.font = { size: 11, bold: ci === 0, color: ci === 0 ? { argb: "FFFFFFFF" } : { argb: "FF1E293B" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ci === 0 ? argb : (i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC") } };
      cell.alignment = { horizontal: ci === 0 ? "left" : "center", vertical: "middle" };
      cell.border = {
        top: { style: "hair", color: { argb: "FFE2E8F0" } },
        bottom: { style: "hair", color: { argb: "FFE2E8F0" } },
        left: { style: "hair", color: { argb: "FFE2E8F0" } },
        right: { style: "hair", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  // Totais
  const allOverdue = rows.filter(r => daysOverdue(r.dataEmissao) > 5);
  const allCritical = allOverdue.filter(r => daysOverdue(r.dataEmissao) > 20);
  const totRow = wf.getRow(5 + COMPRADORES.length);
  totRow.height = 17;
  const totVals = ["TOTAL", rows.length, allOverdue.length, allCritical.length,
    rows.length > 0 ? `${Math.round((allOverdue.length / rows.length) * 100)}%` : "0%"];
  totVals.forEach((v, ci) => {
    const cell = totRow.getCell(ci + 1);
    cell.value = v;
    cell.font = { size: 11, bold: true, color: { argb: "FF1E293B" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
    cell.alignment = { horizontal: ci === 0 ? "left" : "center", vertical: "middle" };
    cell.border = { top: { style: "thin", color: { argb: "FF94A3B8" } } };
  });

  // ── Tabela de itens vencidos ──
  const faltasStart = 5 + COMPRADORES.length + 3;
  const faltasTitleCell = wf.getCell(`A${faltasStart - 1}`);
  faltasTitleCell.value = "Detalhamento das Faltas";
  faltasTitleCell.font = { bold: true, size: 12, color: { argb: "FF1E293B" } };
  wf.mergeCells(`A${faltasStart - 1}:H${faltasStart - 1}`);
  wf.getRow(faltasStart - 1).height = 20;

  const faltaCols = [
    "Dias em Atraso", "Nº SC", "Item", "Produto", "Descrição", "Grupo", "Comprador", "Data Emissão"
  ];
  const fhRow = wf.getRow(faltasStart);
  fhRow.height = 18;
  faltaCols.forEach((h, i) => {
    const cell = fhRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7F1D1D" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const sortedOverdue = allOverdue
    .map(r => ({ ...r, days: daysOverdue(r.dataEmissao) }))
    .sort((a, b) => b.days - a.days);

  sortedOverdue.forEach((row, idx) => {
    const r = wf.getRow(faltasStart + 1 + idx);
    r.height = 16;
    const isEven2 = idx % 2 === 0;
    const rowBg = isEven2 ? "FFFFFFFF" : "FFFFF5F5";
    const urgencyArgb = row.days > 20 ? "FFDC2626" : row.days > 10 ? "FFEa580C" : "FFD97706";
    const vals2 = [
      `${row.days}d`,
      row.numeroSC,
      row.itemSC,
      row.produto,
      row.descricao,
      row.grupo,
      row.comprador,
      row.dataEmissao ? formatDate(row.dataEmissao) : "",
    ];
    vals2.forEach((v, ci) => {
      const cell = r.getCell(ci + 1);
      cell.value = v;
      cell.font = {
        size: 11,
        bold: ci === 0,
        color: { argb: ci === 0 ? urgencyArgb : "FF1E293B" },
      };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      cell.alignment = { vertical: "middle", horizontal: ci === 0 ? "center" : "left", wrapText: false };
      cell.border = {
        top: { style: "hair", color: { argb: "FFFECACA" } },
        bottom: { style: "hair", color: { argb: "FFFECACA" } },
        left: { style: "hair", color: { argb: "FFFECACA" } },
        right: { style: "hair", color: { argb: "FFFECACA" } },
      };
    });
  });

  // Widths da aba Faltas
  wf.columns = [
    { width: 14 }, { width: 13 }, { width: 7 }, { width: 18 },
    { width: 50 }, { width: 20 }, { width: 13 }, { width: 16 },
  ];
  wf.views = [{ state: "frozen", ySplit: faltasStart }];
  wf.autoFilter = { from: { row: faltasStart, column: 1 }, to: { row: faltasStart, column: 8 } };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
