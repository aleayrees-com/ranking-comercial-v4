# Revisao QA - Ranking de Closer e SDR

## Resultado

Status: aprovado para v1 local, com pendencia operacional de coordenadas definitivas da planilha.

## Evidencias

- Testes unitarios e UI: `npm test`.
- Build de producao: `npm run build`.
- Contrato de fonte: `docs/source-contract.md`.
- Regras de negocio: `docs/rules-ranking-de-closer-e-sdr.md`.
- Validacao detalhada: `docs/validation-ranking-de-closer-e-sdr.md`.

## Itens Verificados

- Closers ordenados por receita realizada.
- Desempate de closers por logos, depois nome e `memberId`.
- SDR/pre-vendas ordenados por reunioes realizadas.
- Agregacao por integrante dentro da janela de periodo.
- Periodo sem dados exibindo estado vazio.
- Registros incompletos exibindo inconsistencias.
- Loading e erro renderizados pela UI.
- Planilha do Miguel rastreada no contrato e fixture local.

## Pendencia Operacional

As coordenadas definitivas dos blocos `SDR Inbound`, `BDR Outbound`, `CLOSERS` e `REALIZADO` ainda precisam ser aprovadas com o dono da planilha antes de qualquer automacao externa.
