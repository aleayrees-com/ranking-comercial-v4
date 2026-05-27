# Regras de Negocio - Ranking de Closer e SDR

## Objetivo

Definir as regras de calculo para o ranking com podio top 3 de closers e SDRs, lista completa abaixo do podio e filtro por periodo.

## Entrada

O calculo deve usar exclusivamente linhas normalizadas conforme `docs/source-contract.md`:

```ts
type RankingRole = 'closer' | 'sdr';
```

Colunas usadas:

- `period`
- `role`
- `memberId`
- `memberName`
- `revenue`
- `logos`
- `meetingsHeld`
- `sourceChannel`

## Filtro de Periodo

- O usuario seleciona uma janela de periodo com `start`, `end` e `label`.
- O ranking considera somente linhas em que `period` esteja entre `start` e `end`, inclusive.
- Linhas fora da janela selecionada nao entram no calculo daquele periodo.

## Ranking de Closers

Inclui somente linhas com `role = closer`.

Metricas exibidas:

- Receita realizada no periodo: soma de `revenue`.
- Total de logos/contratos fechados: soma de `logos`.

Ordenacao:

1. Maior `revenue`.
2. Em caso de empate, maior `logos`.
3. Persistindo empate, ordem alfabetica por `memberName`.
4. Persistindo empate tecnico, `memberId` em ordem alfabetica para resultado deterministico.

Regras:

- `meetingsHeld` de closer nao influencia o ranking v1.
- `revenue` ausente, negativa ou nao numerica torna a linha inconsistente.
- `logos` ausente, negativo, decimal ou nao numerico torna a linha inconsistente.
- Closers sem receita e sem logos podem aparecer no ranking com `0`, desde que a linha esteja completa e seja uma medicao valida.

## Ranking de SDR / Pre-vendas

Inclui somente linhas com `role = sdr`.

Metricas exibidas:

- Total de reunioes acontecidas/realizadas: soma de `meetingsHeld`.

Ordenacao:

1. Maior `meetingsHeld`.
2. Em caso de empate, ordem alfabetica por `memberName`.
3. Persistindo empate tecnico, `memberId` em ordem alfabetica para resultado deterministico.

Regras:

- `revenue` e `logos` de SDR nao influenciam o ranking v1.
- `meetingsHeld` ausente, negativo, decimal ou nao numerico torna a linha inconsistente.
- SDRs sem reunioes podem aparecer no ranking com `0`, desde que a linha esteja completa e seja uma medicao valida.
- Blocos de BDR/pre-vendas da planilha devem ser normalizados como `sdr` nesta etapa.

## Podio e Lista Completa

- O podio destaca os tres primeiros colocados de cada ranking.
- A lista completa abaixo do podio exibe todos os integrantes ordenados, incluindo os top 3.
- A posicao exibida deve ser recalculada a cada mudanca de periodo.
- A posicao deve ser sequencial: `1`, `2`, `3`, `4`...
- Nao usar ranking denso para empates; o criterio de desempate sempre produz ordem deterministica.

## Agregacao por Integrante

Quando houver mais de uma linha para a mesma janela de periodo, `role` e `memberId`:

- Somar `revenue`.
- Somar `logos`.
- Somar `meetingsHeld`.
- Preservar o primeiro `memberName` nao vazio.
- Concatenar `sourceChannel` distintos apenas para auditoria, sem exibir duplicado na UI.

Essa regra permite consolidar blocos diferentes da planilha sem duplicar o integrante no ranking.

## Estados da Experiencia

### Carregando

Exibir quando a fonte local ainda esta sendo lida, parseada ou validada.

### Vazio

Exibir quando:

- Nao existem linhas para o periodo selecionado.
- Todas as linhas do periodo foram rejeitadas por inconsistencia.

### Erro

Exibir quando:

- A fonte local nao puder ser carregada.
- O contrato de colunas estiver ausente.
- O parser nao conseguir interpretar o arquivo.

### Dados inconsistentes

Exibir quando houver linhas rejeitadas ou campos suspeitos. A UI pode continuar mostrando o ranking com linhas validas, desde que sinalize as inconsistencias.

## Mapeamento Operacional Inicial

Para as abas CDR mensais e a aba base `LEAD BROKER`, os blocos abaixo ainda dependem de coordenadas definitivas. Ate a aprovacao final do contrato, devem ser tratados como **mapeamento operacional inicial**:

- `PRÉ VENDAS`: extrair a linha `REALIZADO` para `meetingsHeld`.
- `CLOSERS`: extrair `Receita`/`REALIZADO` para `revenue` e `Vendas` para `logos`.
- `LEAD BROKER`: usar colunas `SDR` e `CLOSER` como auditoria de nomes, alias e exclusoes.
- `REALIZADO`: preferir valores realizados sobre metas.
- `META DO MES`: nao compoe o ranking v1.

## Criterios de Aceite Tecnicos

- Ranking de closers mostra receita total realizada e logos totais por integrante no periodo.
- Ranking de SDR/pre-vendas mostra reunioes acontecidas/realizadas por integrante no periodo.
- Top 3 aparece em podio visual.
- Lista completa aparece abaixo do podio com posicao, nome e metricas principais.
- Troca de periodo recalcula totais, desempates e posicoes.
- Inconsistencias sao reportadas sem quebrar dados validos.
- A fonte local preserva rastreabilidade com a planilha do Miguel via `sourceChannel`.
