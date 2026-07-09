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

- A API `functions/api/ranking.ts` pode consultar `public.investidores.avatar_url` server-side quando o ambiente Cloudflare tiver `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
- A API filtra os perfis usando somente nomes encontrados na planilha do período carregado e devolve o campo `investors` junto com as linhas do ranking.
- A UI combina os perfis dinâmicos da API com `src/data/investorProfiles.ts`, mantendo os aliases e fotos locais como fallback.
- Quando existe imagem dinâmica ou local, a foto é exibida.
- Quando não existe imagem, a interface usa iniciais estáveis do integrante.

## Variáveis de ambiente

- `SUPABASE_URL`: URL do projeto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: chave server-side usada somente na Function.

Fallbacks aceitos pelo código, caso já existam no ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Não expor service role key, signed URL longa ou dump bruto de `backup-supabase/02_data.sql` em documentação ou código front-end.
