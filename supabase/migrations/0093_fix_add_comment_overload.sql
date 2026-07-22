-- Bug real, pego em teste: create or replace function identifica a função
-- pela ASSINATURA (tipos dos parâmetros), não pelo nome — como 0091 mudou
-- de (uuid, text) pra (uuid, text, uuid), o Postgres criou uma SEGUNDA
-- função em vez de substituir a antiga. Com p_parent_id tendo default null,
-- as duas ficaram chamáveis com só (post_id, text), e toda chamada real
-- passou a falhar com "Could not choose the best candidate function".
drop function if exists public.add_post_comment(uuid, text);
