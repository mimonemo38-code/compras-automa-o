import { useState, useCallback, useRef } from "react";
import { SCRow, processFile, exportToExcel } from "@/lib/processExcel";
import { fetchKeywordRules, classify } from "@/lib/classify";
import DataTable from "@/components/DataTable";
import SummaryPanel from "@/components/SummaryPanel";

interface HomeProps {
  onRules: () => void;
  onPortfolio: () => void;
}

export default function Home({ onRules, onPortfolio }: HomeProps) {
  const [rows, setRows] = useState<SCRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [filterComprador, setFilterComprador] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setErrors(["Por favor, selecione um arquivo Excel (.xlsx ou .xls)"]);
      return;
    }
    setLoading(true);
    setErrors([]);
    setRows([]);
    setFilterComprador("");
    setFileName(file.name);
    try {
      const rules = await fetchKeywordRules();
      const { rows: processed, errors: errs } = await processFile(file, rules);
      setRows(processed);
      setErrors(errs);
    } catch (err) {
      setErrors([`Erro ao processar arquivo: ${String(err)}`]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleExport = async () => {
    if (!rows.length) return;
    const baseName = fileName?.replace(/\.[^.]+$/, "") ?? "SC";
    await exportToExcel(rows, `${baseName}_Processada.xlsx`);
  };

  const handleRuleSaved = useCallback(async () => {
    if (!rows.length) return;
    const freshRules = await fetchKeywordRules();
    setRows((prev) =>
      prev.map((row) => {
        const result = classify(row.produto, row.descricao, freshRules);
        return {
          ...row,
          comprador: result.compradora,
          grupo: result.grupo || row.grupo,
          classificacaoSource: result.source,
        };
      })
    );
  }, [rows.length]);

  const unclassifiedCount = rows.filter((r) => r.classificacaoSource === "unclassified").length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-sm font-bold tracking-tight">SC Protheus</h1>
          <p className="text-[10px] text-slate-400">Processamento de Solicitações de Compra</p>
        </div>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            <button
              onClick={handleExport}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar Excel
            </button>
          )}
          <button
            onClick={onPortfolio}
            className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Divisão de Carteira
          </button>
          <button
            onClick={onRules}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Palavras-chave
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-3">
        <div
          className={`border-2 border-dashed rounded-xl transition-all cursor-pointer ${
            rows.length > 0
              ? "border-slate-200 bg-white py-3 px-4 shadow-sm"
              : "border-blue-300 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-400 py-10 px-6 text-center"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleInputChange}
          />

          {rows.length > 0 ? (
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{fileName}</div>
                  <div className="text-slate-500">
                    {rows.length} linhas processadas — clique para carregar outro arquivo
                  </div>
                </div>
              </div>
              {unclassifiedCount > 0 && (
                <div className="ml-auto bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  {unclassifiedCount} sem classificação
                </div>
              )}
            </div>
          ) : (
            <div>
              {loading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[11px] text-blue-600 font-medium">Processando arquivo...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-700">
                      Arraste o relatório do Protheus aqui
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ou clique para selecionar o arquivo (.xlsx)
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 bg-white border border-slate-200 rounded-lg px-4 py-2 max-w-sm">
                    O arquivo deve ter duas linhas de cabeçalho — a primeira (título) é ignorada automaticamente.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-[11px] text-red-700 space-y-1">
            {errors.map((e, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-0.5">⚠</span>
                <span>{e}</span>
              </div>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <>
            <SummaryPanel
              rows={rows}
              filterComprador={filterComprador}
              onFilterChange={setFilterComprador}
            />
            <DataTable rows={rows} filterComprador={filterComprador} onRuleSaved={handleRuleSaved} />
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-2 text-[10px] text-slate-400 flex items-center justify-between">
        <span>SC Protheus — Classificação automática de materiais</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-red-400 rounded-full" />
          Datas em vermelho = mais de 7 dias da emissão
        </span>
      </footer>
    </div>
  );
}
