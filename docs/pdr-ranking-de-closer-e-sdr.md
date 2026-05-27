# PDR - Ranking de Closer e SDR

## Contexto

Ideia descoberta em `docs/01-ideas/Ranking de Closer e SDR.md`.

Eu como coordenador de Receita quero um ranking com podio do top 3 closer + ranking top 3 de pre-vendas e lista abaixo do podio com a posicao dos integrantes.

## Problema

A area de Receita precisa transformar a nota em uma entrega priorizavel, com objetivo, escopo, dados necessarios e criterios de aceite claros.

## Objetivo

Estruturar a iniciativa para evolucao em PRD, regras de negocio, contrato de dados, plano tecnico e validacao.

## Usuarios e Stakeholders

- Coordenador de Receita
- Coordenacao de Receita
- Closers
- Time de pre-vendas / SDR
- Gestao

## Escopo

- Exibir ranking com destaque visual para top 3 e lista de demais posicoes.
- Calcular ranking de closers por receita realizada e logos no periodo.
- Calcular ranking de pre-vendas por reunioes acontecidas no periodo.
- Mapear a planilha citada como fonte de dados.
- Definir contrato local antes de qualquer integracao externa.

## Criterios de Ordenacao

- Closers: receita realizada desc, logos desc, nome asc, `memberId` asc.
- SDR/pre-vendas: reunioes realizadas desc, nome asc, `memberId` asc.

## Fora de Escopo

- Integracoes externas reais sem aprovacao explicita.
- Leitura de secrets, tokens ou credenciais.
- Deploy, migrations ou alteracoes destrutivas.

## Riscos

- Fonte de dados incompleta ou sem contrato de colunas.
- Divergencia entre metricas esperadas pelo negocio e dados disponiveis.
- Dependencia operacional de uma planilha especifica sem caminho local padronizado.

## Proximas Acoes

- Revisar `docs/prd-ranking-de-closer-e-sdr.md`.
- Validar `docs/plano-tecnico-ranking-de-closer-e-sdr.md`.
- Validar coordenadas finais da planilha com o dono da fonte.
