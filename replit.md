# SC Protheus

Sistema web para processamento de Solicitações de Compra exportadas do Protheus, com classificação automática de compradora por material.

## Run & Operate

- `pnpm --filter @workspace/sc-protheus run dev` — rodar o front-end (porta dinâmica)
- `pnpm --filter @workspace/api-server run dev` — rodar o servidor API (porta 8080)
- `pnpm run typecheck` — verificar tipos em todos os pacotes
- `pnpm run build` — build completo

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS
- Processamento Excel: xlsx (client-side, sem servidor)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/sc-protheus/src/` — frontend do sistema SC
  - `src/pages/Home.tsx` — tela principal (upload + tabela)
  - `src/pages/Rules.tsx` — gerenciamento de palavras-chave
  - `src/components/DataTable.tsx` — tabela de resultados
  - `src/components/SummaryPanel.tsx` — painel de resumo por compradora
  - `src/lib/classify.ts` — lógica de classificação (base + regra 13 + palavras-chave)
  - `src/lib/processExcel.ts` — leitura e processamento do arquivo Excel
  - `src/data/classification.json` — base de 3564 materiais (Código → Grupo + Compradora)

## Architecture decisions

- Processamento 100% client-side com a biblioteca `xlsx` — sem necessidade de upload para servidor
- A planilha de classificação (Materiais Consolidados) está embutida como JSON no bundle
- Regras de palavras-chave salvas no `localStorage` do navegador — persistem entre sessões
- Ordem de prioridade de classificação: Base de materiais → Regra "13" → Palavras-chave → Não classificado

## Product

- Upload do relatório Protheus (.xlsx) com dois cabeçalhos (linha 1 ignorada)
- Reordenação e filtragem de colunas conforme regra de negócio
- Coluna Grupo preenchida automaticamente (ignorando valor do Protheus)
- Coluna Comprador preenchida por: base de 3564 materiais, regra de código "13" → Dayane, palavras-chave configuráveis
- Datas de emissão em vermelho se passaram mais de 7 dias
- Filtros por compradora, busca por texto, ordenação por coluna
- Exportar resultado para Excel (.xlsx)
- Tela de configuração de palavras-chave com prioridade ajustável

## User preferences

- Fonte tamanho 11 na tabela
- Cabeçalho em negrito
- Datas em vermelho se > 7 dias da emissão
- Colunas: Numero SC | Item SC | Quantidade | UM | Produto | Descricao | Tp | Grupo | Data de Emissao | Solicitante | Comprador
- Coluna Grupo vem da classificação, NÃO do Protheus

## Gotchas

- O arquivo do Protheus tem DOIS cabeçalhos: linha 0 = título lixo, linha 1 = headers reais. O sistema ignora a linha 0 automaticamente.
- A coluna Grupo no arquivo do Protheus é desconsiderada — o sistema preenche com base na planilha de classificação
- Compradora "DAY" na base = Dayane
- Datas no Excel vêm como número serial (ex: 46002) — convertidas com `XLSX.SSF.parse_date_code`
- Ao atualizar a planilha de classificação, regenerar `src/data/classification.json`

## Pointers

- Veja o skill `pnpm-workspace` para estrutura do monorepo
- A base de classificação pode ser atualizada rodando o script de extração em `/tmp/xlsread/`
