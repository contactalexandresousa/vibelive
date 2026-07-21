-- 0053 criou a função com sucesso (CREATE FUNCTION não valida o regex, só
-- executa na chamada) mas \p{L} não é suportado pelo motor de regex do
-- Postgres — só falhava ao chamar de verdade. Corrige com a faixa Latin-1
-- Supplement (À-ÿ) pra acento do português.
create or replace function public._extract_hashtags(p_caption text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct lower(m[1])), '{}')
  from regexp_matches(coalesce(p_caption, ''), '#([[:alnum:]_À-ÿ]{2,50})', 'g') as m;
$$;

-- Backfill: posts que já existiam antes da 0053 nunca passaram pelo
-- trigger, então ficaram com hashtags = '{}' mesmo tendo #hashtag na legenda.
update public.posts set hashtags = public._extract_hashtags(caption);
