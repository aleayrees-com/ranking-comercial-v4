# PRD - Ranking de Closer e SDR

## Visao Geral

Produto derivado da nota `docs/01-ideas/Ranking de Closer e SDR.md`.

Eu como coordenador de Receita quero um ranking com podio do top 3 closer + ranking top 3 de pre-vendas e lista abaixo do podio com a posicao dos integrantes.

## Objetivos

- Dar visibilidade operacional para a ideia descrita na nota.
- Converter a demanda em requisitos implementaveis e testaveis.
- Permitir comparacao rapida de desempenho entre integrantes do time.
- Consolidar indicadores de receita, logos e reunioes realizadas em uma unica experiencia.

## Personas

- Coordenador de Receita
- Coordenacao de Receita
- Closers
- Time de pre-vendas / SDR
- Gestao

## Requisitos Funcionais

- Exibir dados filtraveis por periodo.
- Mostrar estados vazio, carregando, erro e dados inconsistentes.
- Exibir podio visual para os tres primeiros colocados.
- Exibir ranking de closers com receita realizada e total de logos.
- Ordenar vendedores por receita realizada no periodo.
- Aplicar criterio de desempate por numero de logos / contratos fechados.
- Exibir ranking de pre-vendas / SDR com total de reunioes acontecidas.
- Exibir lista completa abaixo do podio com posicao, nome e metricas principais.
- Ler dados de uma fonte tabular aprovada, com contrato de colunas documentado antes da integracao.

## Requisitos Nao Funcionais

- Operar inicialmente com dados locais ou exportacoes autorizadas.
- Manter rastreabilidade entre nota, PDR, PRD, regras e plano tecnico.
- Nao depender de APIs externas nesta etapa do escritorio virtual.

## Experiencia Esperada

- Usuario abre a tela e ve imediatamente o top 3 em destaque.
- Abaixo do destaque, visualiza a lista ordenada dos demais integrantes.
- Ao trocar o periodo, todos os totais e posicoes sao recalculados.
- Dados faltantes aparecem como inconsistencia operacional.

## Dados Locais

- Periodo de analise.
- Identificador e nome do integrante.
- Fonte local ou exportacao autorizada dos dados.
- Receita realizada por closer.
- Total de logos por closer.
- Total de reunioes acontecidas por pre-vendas / SDR.
- Planilha do Miguel mapeada como fonte, usando export/localizacao aprovada antes de qualquer automacao externa.

## Criterios de Aceite

- Total de receita realizado no periodo e total de logos no ranking de closers.
- Total de reuniao acontecida realizada no ranking de pre-vendas.
- Acessar e rastrear planilha do Miguel como fonte de dados.
- Exibir top 3 e lista completa com posicao.
- Exibir estados carregando, erro, vazio e inconsistencias.

## Plano de Validacao

- Revisar `docs/revisao-qa-ranking-de-closer-e-sdr.md`.
- Conferir `docs/rules-ranking-de-closer-e-sdr.md`.
- Validar `docs/plano-tecnico-ranking-de-closer-e-sdr.md`.
