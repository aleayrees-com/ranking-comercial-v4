# ADR 0001 - Fonte local antes de integracao externa

## Status

Aceita.

## Contexto

A demanda exige acessar a planilha do Miguel como fonte de dados, mas tambem define que a v1 nao deve depender de APIs externas, secrets ou automacoes sem aprovacao explicita.

## Decisao

Implementar a v1 com fixture local versionada em `src/data/rankingFixture.ts`, derivada da planilha e acompanhada por contrato em `docs/source-contract.md`.

O fluxo aprovado e:

```text
Planilha do Miguel
  -> exportacao/localizacao autorizada
  -> fixture local
  -> normalizeLocalRows
  -> buildRanking
  -> UI React
```

## Consequencias

- A UI roda localmente sem credenciais e sem quota de Google Sheets em runtime.
- A regra de negocio fica testavel por funcoes puras.
- A troca futura por export CSV ou integracao server-side preserva `buildRanking`.
- Coordenadas da planilha continuam como mapeamento operacional inicial ate aprovacao.
