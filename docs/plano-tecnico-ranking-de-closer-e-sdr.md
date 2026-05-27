# Plano Tecnico - Ranking de Closer e SDR

## Objetivo

Entregar uma v1 local, auditavel e sem dependencias externas para exibir o ranking de closers e SDRs a partir de uma exportacao autorizada da planilha operacional.

## Arquitetura

```text
Planilha do Miguel
  -> exportacao/localizacao autorizada
  -> fixture local em src/data/rankingFixture.ts
  -> normalizeLocalRows
  -> buildRanking
  -> UI React
```

## Componentes

| Camada        | Responsabilidade                                                                                 | Arquivo atual                 |
| ------------- | ------------------------------------------------------------------------------------------------ | ----------------------------- |
| Fixture local | Guarda periodos, metadados da planilha e linhas locais derivadas da fonte aprovada.              | `src/data/rankingFixture.ts`  |
| Normalizador  | Converte moeda/numeros, limpa nomes, cria `memberId` por slug e aplica defaults de origem.       | `src/domain/normalization.ts` |
| Ranking       | Filtra periodo, valida linhas, agrega por integrante, ordena e calcula totais.                   | `src/domain/ranking.ts`       |
| UI            | Deve consumir os periodos e rankings calculados para renderizar podio, lista completa e estados. | `src/App.tsx`                 |

## Fluxo de dados

1. A fixture declara `sourceSpreadsheet`, `periodFilters` e `localSourceRows`.
2. `normalizeLocalRows` transforma linhas locais no contrato `RawRankingRow`.
3. `buildRanking(rows, period)` filtra o periodo selecionado.
4. Linhas invalidas entram em `inconsistencies`; linhas validas seguem para agregacao.
5. Closers sao ordenados por `revenue`, depois `logos`, depois nome e `memberId`.
6. SDRs sao ordenados por `meetingsHeld`, depois nome e `memberId`.
7. A UI deve exibir podio top 3, lista completa, totais e inconsistencias.

## Sem APIs externas

A v1 nao consulta Google Sheets em tempo de execucao. Isso reduz risco de credenciais expostas, quota, latencia e falha de autorizacao no front-end.

Toda integracao com a planilha fica representada por:

- URL e metadados em `sourceSpreadsheet`.
- Contrato local em `docs/source-contract.md`.
- Fixture versionada para testes e desenvolvimento.

## Estados esperados da UI

| Estado          | Condicao                                                                    |
| --------------- | --------------------------------------------------------------------------- |
| Carregando      | Fonte local/export futuro ainda esta sendo carregado, parseado ou validado. |
| Erro            | Fonte ausente, contrato invalido ou parser sem leitura possivel.            |
| Vazio           | Periodo sem linhas validas para closers e SDRs.                             |
| Inconsistencias | Existem linhas rejeitadas, mas dados validos ainda podem ser exibidos.      |

## Testes atuais

- `src/domain/normalization.test.ts`: parsing de moeda BRL, labels vazias e normalizacao local.
- `src/domain/ranking.test.ts`: ordenacao, filtro de periodo, agregacao, inconsistencias e vazio.
- `src/domain/formatting.test.ts`: formatacao pt-BR de moeda e inteiros.
- `src/App.test.tsx`: define a expectativa de UI para periodo, rankings e inconsistencias.

## Proximos passos para trocar fixture por export autorizado

1. Fechar com o dono da planilha as coordenadas definitivas de `SDR Inbound`, `BDR Outbound`, `CLOSERS` e `REALIZADO`.
2. Gerar export autorizado em CSV ou TS mantendo exatamente as colunas do contrato local.
3. Criar um adaptador de importacao que produza `LocalRankingSourceRow[]`, sem mudar `buildRanking`.
4. Validar colunas obrigatorias antes de normalizar.
5. Manter `sourceChannel` com aba/bloco/range para auditoria.
6. Rodar `npm test` e `npm run build` antes de substituir a fixture em producao.
7. So depois avaliar integracao automatica com Google Sheets, preferencialmente server-side e com credenciais fora do front-end.

## Status tecnico atual

- Desempate final por `memberId` implementado e coberto por teste.
- Estados de carregando, erro, vazio e inconsistencias renderizados pela UI e cobertos por `src/App.test.tsx`.
- Coordenadas definitivas da planilha seguem como mapeamento operacional inicial ate validacao do dono da fonte.
