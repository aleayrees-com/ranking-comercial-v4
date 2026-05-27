# Fonte de imagens dos investidores

## Origem

- Sistema fonte: AlfraOS (`red-engine`)
- Projeto local consultado: `C:/Users/Administrator/.gemini/antigravity/playground/primal-lagoon/red-engine`
- Fonte principal: `public.investidores.avatar_url`
- Bucket Supabase mapeado: `avatars`
- Data da coleta local: `2026-05-26`

## Resultado da coleta

- Foram encontrados 33 registros de investidores com `avatar_url`.
- Foram baixadas 32 imagens HTTP/HTTPS para `public/investors/`.
- O bucket privado `avatars` existe, mas a fonte usada para layout foi a coluna `investidores.avatar_url`, que é o mesmo caminho usado nas telas administrativas do AlfraOS.

## Regra de uso no ranking

- A UI lê `src/data/investorProfiles.ts`.
- O ranking tenta casar o nome do integrante com `name` ou `aliases`.
- Quando existe imagem, a foto local é exibida.
- Quando não existe imagem, a interface usa iniciais estáveis do integrante.

## Integração futura

Antes de trocar a fixture por integração em tempo real, confirmar uma das opções:

- `investidores.avatar_url` como fonte de verdade, quando a URL já for pública ou assinada.
- `storage.objects` no bucket privado `avatars`, gerando signed URL server-side.
- `auth.users.raw_user_meta_data.avatar_url` como fallback para fotos Google.

Não expor service role key, signed URL longa ou dump bruto de `backup-supabase/02_data.sql` em documentação ou código front-end.
