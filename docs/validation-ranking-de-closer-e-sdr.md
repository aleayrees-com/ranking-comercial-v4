# Validacao - Ranking de Closer e SDR

## Escopo

Checklist de QA para a v1 local da feature, considerando a fixture derivada da planilha, o normalizador, `buildRanking` e a UI esperada.

## Evidencias usadas

- Contrato: `docs/source-contract.md`
- Regras: `docs/rules-ranking-de-closer-e-sdr.md`
- Qualidade: `docs/data-quality.md`
- Fixture: `src/data/rankingFixture.ts`
- Dominio: `src/domain/normalization.ts`, `src/domain/ranking.ts`, `src/domain/formatting.ts`
- Testes: `src/domain/*.test.ts`, `src/App.test.tsx`

## Resultado dos criterios de aceite

| Criterio                     | Status                 | Evidencia                                                                                                                                           | Lacuna                                                                 |
| ---------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Planilha acessada/rastreada  | Atendido para v1 local | Contrato registra planilha `Cópia de Controle de Resultados \| Alfradique & Co RJ`, abas `LEAD BROKER` e CDRs mensais, GIDs e ranges inspecionados. | Coordenadas definitivas dos blocos ainda dependem do dono da planilha. |
| Fonte local sem API externa  | Atendido               | `src/data/rankingFixture.ts` contem metadados e linhas locais; a UI carrega fixture local, sem Google Sheets em runtime.                            | Troca por export autorizado ainda pendente.                            |
| Receita e logos de closers   | Atendido               | `buildRanking` soma `revenue` e `logos`; UI mostra total e lista; testes cobrem ordenacao, totais e desempate.                                      | Nenhuma lacuna critica.                                                |
| Reunioes de SDR/pre-vendas   | Atendido               | `buildRanking` soma `meetingsHeld`; UI mostra total e lista; testes cobrem filtro de periodo.                                                       | Nenhuma lacuna critica.                                                |
| Ordenacao de closers         | Atendido               | Comparador ordena por `revenue`, `logos`, `memberName` e `memberId`.                                                                                | Nenhuma lacuna critica.                                                |
| Ordenacao de SDRs            | Atendido               | Comparador ordena por `meetingsHeld`, `memberName` e `memberId`.                                                                                    | Nenhuma lacuna critica.                                                |
| Agregacao por integrante     | Atendido               | Teste cobre soma de multiplas linhas na mesma janela de periodo, papel e integrante.                                                                | Nenhuma lacuna critica.                                                |
| Podio top 3 e lista completa | Atendido               | `src/App.tsx` renderiza `podium-list` e tabela completa por ranking.                                                                                | Validado visualmente via navegador ainda recomendado.                  |
| Inconsistencias operacionais | Atendido               | Linhas com metrica ausente, negativa ou nome vazio sao rejeitadas pelo dominio; a UI nao exibe painel separado de auditoria na v1.                  | Nenhuma lacuna critica.                                                |
| Estado vazio                 | Atendido               | UI cobre periodo sem linhas validas em teste controlado; a fixture principal expõe apenas `Maio/2026`.                                              | Nenhuma lacuna critica.                                                |
| Estado loading               | Atendido               | UI mostra carregamento antes de resolver a fixture local; coberto em `src/App.test.tsx`.                                                            | Nenhuma lacuna critica.                                                |
| Estado erro                  | Atendido               | UI aceita erro controlado e renderiza mensagem; coberto em `src/App.test.tsx`.                                                                      | Nenhuma lacuna critica.                                                |

## Execucao de testes

Comando executado:

```bash
npm test
```

Resultado atualizado em 2026-05-26:

- `src/domain/normalization.test.ts`: passou.
- `src/domain/ranking.test.ts`: passou.
- `src/domain/formatting.test.ts`: passou.
- `src/App.test.tsx`: passou.

Resumo observado: 17 testes passaram em 4 arquivos.

## Checklist de release

- [x] Contrato local documentado.
- [x] Fonte da planilha registrada.
- [x] Ranking de closers validado no dominio.
- [x] Ranking de SDR/pre-vendas validado no dominio.
- [x] Inconsistencias rejeitam linhas invalidas sem quebrar dados validos.
- [x] Fixture local evita dependencia de API externa na v1.
- [x] UI implementada conforme `src/App.test.tsx`.
- [x] Estados loading/erro conectados a carregamento local e erro controlado.
- [x] Desempate final por `memberId` implementado e testado.
- [ ] Coordenadas definitivas da planilha aprovadas.
