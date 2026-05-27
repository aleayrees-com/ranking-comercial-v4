# Contrato de Fonte - Ranking de Closer e SDR

## Objetivo

Definir o contrato local aprovado para a primeira etapa da feature **Ranking de Closer e SDR**, mantendo rastreabilidade entre a planilha do Miguel e o arquivo normalizado que alimenta a UI e os testes.

Nesta etapa, a aplicacao **nao depende de API externa**. A fonte operacional aprovada e uma exportacao/localizacao local derivada da planilha:

- Spreadsheet: `Cópia de Controle de Resultados | Alfradique & Co RJ`
- URL: `https://docs.google.com/spreadsheets/d/1iVyJSFP6n_We9TMxFU0xHtcXnAFl6U-0Sgh3StCiqkc/edit?gid=839739381#gid=839739381`
- Aba inicial mapeada: `LEAD BROKER`
- Aba CDR mapeada para a v1: `CDR MAIO/26`
- GID: `839739381`
- Timezone da planilha: `America/Sao_Paulo`

## Fonte Normalizada Local

Arquivo esperado: CSV ou TS local com uma linha por integrante, papel e data de medicao dentro do periodo selecionado.

Contrato de colunas:

| Coluna          | Tipo              | Obrigatorio               | Descricao                                                                                               | Exemplo                    |
| --------------- | ----------------- | ------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------- |
| `period`        | `string`          | Sim                       | Data ou fechamento da medicao no formato ISO `YYYY-MM-DD`. O filtro da UI usa uma janela `start`/`end`. | `2026-05-31`               |
| `role`          | `closer` ou `sdr` | Sim                       | Papel do integrante no ranking. BDR/pre-vendas deve ser normalizado como `sdr` nesta etapa.             | `closer`                   |
| `memberId`      | `string`          | Sim                       | Identificador estavel do integrante. Pode ser slug local quando a planilha nao trouxer ID formal.       | `lucas-macedo`             |
| `memberName`    | `string`          | Sim                       | Nome exibido no ranking, apos alias aprovado.                                                           | `Lucas Macedo`             |
| `revenue`       | `number` ou vazio | Obrigatorio para `closer` | Receita realizada no periodo. Para SDRs pode ser vazio/nulo.                                            | `32500`                    |
| `logos`         | `number` ou vazio | Obrigatorio para `closer` | Total de logos/contratos fechados no periodo. Para SDRs pode ser vazio/nulo.                            | `4`                        |
| `meetingsHeld`  | `number` ou vazio | Obrigatorio para `sdr`    | Total de reunioes realizadas/acontecidas no periodo. Para closers pode ser vazio/nulo.                  | `12`                       |
| `sourceChannel` | `string`          | Sim                       | Origem operacional do dado.                                                                             | `google-sheet:LEAD BROKER` |

Exemplo CSV:

```csv
period,role,memberId,memberName,revenue,logos,meetingsHeld,sourceChannel
2026-05-31,closer,lucas-macedo,Lucas Macedo,126698.52,7,,google-sheet:CDR MAIO/26
2026-05-31,sdr,lucas-moura,Lucas Moura,,,15,google-sheet:CDR MAIO/26
```

Exemplo TypeScript:

```ts
export type RankingRole = 'closer' | 'sdr';

export interface RankingSourceRow {
  readonly period: string;
  readonly role: RankingRole;
  readonly memberId: string;
  readonly memberName: string;
  readonly revenue: number;
  readonly logos: number;
  readonly meetingsHeld: number;
  readonly sourceChannel: string;
}
```

## Mapeamento Inicial da Planilha Fonte

Os ranges inspecionados foram `'LEAD BROKER'!A1:AH60` e `'CDR MAIO/26'!FN12:GE20`, com metadados oficiais do arquivo `Cópia de Controle de Resultados | Alfradique & Co RJ`.

Mapeamento operacional usado na fixture local:

| Local na planilha                           | Papel normalizado | Campo(s) de destino | Observacao                                                                             |
| ------------------------------------------- | ----------------- | ------------------- | -------------------------------------------------------------------------------------- |
| CDR mensal, bloco `CLOSERS`                 | `closer`          | `revenue`, `logos`  | Usa `REALIZADO`/`Receita` para receita e `Vendas` para logos/contratos fechados.       |
| CDR mensal, bloco `PRÉ VENDAS`              | `sdr`             | `meetingsHeld`      | Usa a linha `REALIZADO` do bloco de pre-vendas/SDR.                                    |
| Aba `LEAD BROKER`, colunas `SDR` e `CLOSER` | auditoria         | alias e exclusoes   | Confere nomes originais, remove `Bruno Alfradique` do ranking e evita SDR como closer. |
| Aba `CDR MAIO/26`                           | filtro            | `periodFilters`     | Define a janela `Maio/2026` para a v1.                                                 |

Nomes observados na fonte normalizada:

- Closers em Maio/2026: `Lucas Macedo`, `Miguel de Oliveira Guimaraes Vieira`, `Carlos Guerra`.
- SDR/pre-vendas em Maio/2026: `Wilson Junior`, `Lucas Moura`, `Lucas Macedo`.

Aliases aprovados na v1:

- `Macedo Lucas Rodrigues` -> `Lucas Macedo`.
- `Lucas Vieira` -> `Lucas Moura`.
- `Bruno Alfradique` -> ignorado no ranking de closer.

Esses nomes devem ser tratados como **mapeamento operacional inicial**, nao como cadastro definitivo. O `memberId` local deve ser gerado por slug do nome ate existir identificador aprovado.

## Regras de Normalizacao

- `period`: derivar do fechamento de cada aba CDR mensal.
- `role`: aceitar somente `closer` ou `sdr`.
- `memberId`: usar identificador canonico quando houver alias aprovado; caso contrario, slug minusculo, sem acento, com hifens.
- `memberName`: preservar nome de exibicao canonico aprovado, removendo espacos duplicados.
- `revenue`: numero decimal em BRL, sem simbolo de moeda, obrigatorio para closers.
- `logos`: inteiro maior ou igual a `0`, obrigatorio para closers.
- `meetingsHeld`: inteiro maior ou igual a `0`, obrigatorio para SDR/pre-vendas.
- `sourceChannel`: preencher com `Lead Broker` para linhas derivadas das abas CDR/Lead Broker.

## Linhagem

```text
Google Sheet Miguel
  -> exportacao/localizacao autorizada
  -> fonte normalizada local CSV/TS
  -> normalizador/validador
  -> calculo de rankings
  -> UI com podio top 3 e lista completa
```

## Garantias da V1

- Uma linha representa um integrante em um papel dentro de um periodo.
- A UI deve consumir apenas a fonte normalizada ou fixture derivada dela.
- Qualquer dado faltante ou negativo deve ser sinalizado como inconsistencia operacional antes de entrar nos rankings.
- A planilha original continua sendo fonte operacional, mas a integracao automatica externa fica fora de escopo ate aprovacao explicita.
