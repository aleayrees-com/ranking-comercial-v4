# Ranking de Closer e SDR

Dashboard local em Vite + React + TypeScript para rankear closers por receita/logos e SDRs por reunioes realizadas.

## O que e

A feature calcula dois rankings por periodo:

- Closers: ordenados por receita realizada, com logos como desempate.
- SDR/pre-vendas: ordenados por reunioes realizadas.

A v1 em producao le a planilha operacional por uma Function do Cloudflare Pages
(`/api/ranking`) e mantem uma fixture local apenas como fallback.

## Como rodar

Use os scripts existentes no `package.json`:

```bash
npm install
npm run dev
npm test
npm run build
```

O `npm run dev` inicia o Vite em `127.0.0.1`; o terminal informa a porta disponivel.

## Fonte dos dados

- Planilha: `Controle de Resultados | Alfradique & Co RJ`
- Aba mapeada: `CDR MAIO/26`
- GID: `1481288268`
- Timezone: `America/Sao_Paulo`
- URL: `https://docs.google.com/spreadsheets/d/1iqFf2dbfsG_tl2FB8TrPsBfjO3xkvQYrnvqheUPY9KE/edit?gid=1481288268#gid=1481288268`

A Function `functions/api/ranking.ts` busca o CSV publico da aba, sem cache, e
normaliza os blocos oficiais de `REALIZADO`, `Vendas` e `PRÉ VENDAS`. A fixture
local fica em `src/data/rankingFixture.ts` e preserva a rastreabilidade da origem.
O contrato esperado esta em `docs/source-contract.md`.

O site atualiza os dados automaticamente a cada 10 segundos e tambem ao voltar
para a aba/janela. Nao e necessario dar F5 na TV ou no navegador.

## Controle remoto dos efeitos do Denner

- Tela de controle: `https://rank.v4alfradique.com/?control=toasty`
- Endpoint: `POST /api/toasty`
- Botao `Soltar Toasty`: mostra o Denner com placa `TOASTY!` e toca o audio
  Toasty.
- Botao `Soltar Rapaz`: mostra o Denner com placa `RAPAZ!` e toca o audio
  Rapaz.
- A TV consulta `GET /api/toasty` a cada 2 segundos e dispara o easter egg
  quando encontra um comando recente.

Para producao confiavel entre dispositivos, vincule um KV namespace no
Cloudflare Pages com o binding `TOASTY_KV` ou `RANKING_TOASTY_KV`. Se definir
`TOASTY_CONTROL_KEY`, abra o controle com `?control=toasty&key=SUA_CHAVE`.

## Contrato e regras

- Contrato da fonte local: `docs/source-contract.md`
- Regras de ranking: `docs/rules-ranking-de-closer-e-sdr.md`
- Qualidade de dados: `docs/data-quality.md`
- Nota de origem: `docs/01-ideas/Ranking de Closer e SDR.md`
- PDR: `docs/pdr-ranking-de-closer-e-sdr.md`
- PRD: `docs/prd-ranking-de-closer-e-sdr.md`
- Plano tecnico: `docs/plano-tecnico-ranking-de-closer-e-sdr.md`
- Checklist de validacao: `docs/validation-ranking-de-closer-e-sdr.md`
- Revisao QA: `docs/revisao-qa-ranking-de-closer-e-sdr.md`
- Decisao tecnica: `docs/08-decisions/0001-fonte-local-ranking-closer-sdr.md`

## Criterios cobertos

- Normalizacao local de moeda BRL, numeros e `memberId`.
- Ranking de closers com receita total e logos totais.
- Ranking de SDR/pre-vendas com reunioes realizadas.
- Filtro por periodo.
- Agregacao por integrante no mesmo periodo/papel.
- Rejeicao de linhas inconsistentes sem quebrar linhas validas.
- Rastreabilidade com a planilha do Miguel por fonte local e contrato documentado.
