# Qualidade de Dados - Ranking de Closer e SDR

## Objetivo

Definir validacoes minimas para impedir que dados incompletos, inconsistentes ou fora do periodo corrompam o ranking de closers e SDRs.

## Principio

O ranking deve ser calculado somente com linhas validas. Linhas invalidas devem ser rejeitadas do calculo e exibidas como inconsistencia operacional com motivo claro.

## Checks Obrigatorios

| Codigo                  | Inconsistencia       | Regra                                                                              | Severidade | Acao                                                                   |
| ----------------------- | -------------------- | ---------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `missing_member_name`   | Nome ausente         | `memberName` vazio, nulo ou so com espacos.                                        | Alta       | Rejeitar linha.                                                        |
| `invalid_role`          | Papel invalido       | `role` diferente de `closer` ou `sdr`.                                             | Alta       | Rejeitar linha.                                                        |
| `missing_revenue`       | Receita ausente      | `role = closer` e `revenue` vazio, nulo ou nao numerico.                           | Alta       | Rejeitar linha.                                                        |
| `missing_logos`         | Logos ausentes       | `role = closer` e `logos` vazio, nulo ou nao numerico.                             | Alta       | Rejeitar linha.                                                        |
| `missing_meetings_held` | Reunioes ausentes    | `role = sdr` e `meetingsHeld` vazio, nulo ou nao numerico.                         | Alta       | Rejeitar linha.                                                        |
| `negative_metric`       | Valor negativo       | `revenue`, `logos` ou `meetingsHeld` menor que `0`.                                | Alta       | Rejeitar linha.                                                        |
| `row_without_metric`    | Linha sem metrica    | `revenue = 0`, `logos = 0` e `meetingsHeld = 0` sem confirmacao de medicao valida. | Media      | Sinalizar para revisao; aceitar somente se a origem indicar zero real. |
| `period_out_of_range`   | Data fora do periodo | `period` ausente, invalido ou fora da janela `start`/`end` selecionada.            | Alta       | Nao incluir no periodo atual; reportar.                                |

## Validacoes de Contrato

Antes do calculo, validar que a fonte local possui exatamente as colunas minimas:

- `period`
- `role`
- `memberId`
- `memberName`
- `revenue`
- `logos`
- `meetingsHeld`
- `sourceChannel`

Regras:

- Colunas extras podem existir, mas nao entram no calculo v1.
- Coluna obrigatoria ausente gera erro de contrato e impede o ranking.
- Tipos devem ser normalizados antes de rankear.
- Numeros com formato brasileiro devem ser convertidos para numero decimal padrao.

## Validacoes por Papel

### Closer

Campos obrigatorios para ranking:

- `period`
- `role`
- `memberId`
- `memberName`
- `revenue`
- `logos`
- `sourceChannel`

Campos esperados:

- `meetingsHeld = 0`, quando nao aplicavel.

Falhas criticas:

- Receita ausente.
- Logos ausentes.
- Receita negativa.
- Logos negativos.

### SDR / Pre-vendas

Campos obrigatorios para ranking:

- `period`
- `role`
- `memberId`
- `memberName`
- `meetingsHeld`
- `sourceChannel`

Campos esperados:

- `revenue = 0`, quando nao aplicavel.
- `logos = 0`, quando nao aplicavel.

Falhas criticas:

- Reunioes realizadas ausentes.
- Reunioes realizadas negativas.
- Papel vindo como BDR, SDR Inbound ou pre-vendas sem normalizacao para `sdr`.

## Validacoes de Periodo

- O formato preferencial e `YYYY-MM-DD`.
- Para as abas CDR mensais, a data de fechamento local usada na fixture e o ultimo dia do respectivo mes.
- Linhas derivadas de abas mensais diferentes nao devem entrar no mesmo periodo.
- Ao trocar o periodo na UI, inconsistencias de outros periodos nao devem bloquear o periodo atual.

## Validacoes de Duplicidade

Chave logica:

```text
period + role + memberId
```

Se houver duplicidade:

- Agregar metricas quando as linhas representarem blocos complementares.
- Sinalizar duplicidade quando as linhas tiverem a mesma origem e mesmas metricas, pois pode indicar export duplicado.
- Manter auditoria por `sourceChannel`.

## Validacoes de Consistencia Operacional

Checks recomendados para revisao manual:

- Nome com variacoes entre blocos, por exemplo abreviacao em um bloco e nome completo em outro.
- Integrante aparecendo como `closer` e `sdr` no mesmo periodo.
- `memberId` gerado por slug que muda por diferenca de acento, espaco ou sobrenome.
- Receita positiva com `logos = 0`.
- `logos > 0` com `revenue = 0`.
- `meetingsHeld` muito acima do padrao historico do time.

Esses casos nao precisam bloquear automaticamente o ranking v1, mas devem aparecer no painel de inconsistencias quando detectados.

## Saida Esperada do Validador

Formato recomendado:

```ts
export interface DataQualityIssue {
  readonly code: string;
  readonly severity: 'low' | 'medium' | 'high';
  readonly message: string;
  readonly rowIndex?: number;
  readonly memberId?: string;
  readonly memberName?: string;
  readonly sourceChannel?: string;
}
```

## Runbook Curto

1. Conferir se a exportacao/localizacao local veio da aba correta.
2. Validar contrato de colunas.
3. Normalizar periodo, papel, nomes e numeros.
4. Separar linhas validas e invalidas.
5. Calcular rankings apenas com linhas validas.
6. Exibir inconsistencias com motivo e origem.
7. Quando houver duvida de coordenada da planilha, marcar como **mapeamento operacional inicial** e pedir validacao operacional antes de automatizar.
