-- Busca hoje só encontra perfis — não existe nenhuma forma de descobrir
-- posts por assunto. Extrai #hashtags da legenda pra um array indexado
-- (GIN), pra não precisar de ILIKE '%...%' em texto livre a cada busca.
alter table public.posts add column hashtags text[] not null default '{}';

create index posts_hashtags_idx on public.posts using gin (hashtags);

-- \p{L} (letra Unicode) não é suportado pelo motor de regex do Postgres —
-- usa a faixa Latin-1 Supplement (À-ÿ) pra cobrir acento do português além
-- de [:alnum:] (ASCII).
create function public._extract_hashtags(p_caption text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct lower(m[1])), '{}')
  from regexp_matches(coalesce(p_caption, ''), '#([[:alnum:]_À-ÿ]{2,50})', 'g') as m;
$$;

create function public._set_post_hashtags()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.hashtags := public._extract_hashtags(new.caption);
  return new;
end;
$$;

create trigger trg_set_post_hashtags
  before insert or update of caption on public.posts
  for each row execute function public._set_post_hashtags();

-- Reaproveita a mesma RLS de posts (esconde privado não desbloqueado e
-- conta suspensa) — só filtra por hashtag em cima do que já é público.
create function public.search_posts_by_hashtag(p_tag text, p_limit int default 40)
returns setof public.posts
language sql
stable
set search_path = ''
as $$
  select * from public.posts
  where hashtags @> array[lower(p_tag)]
  order by created_at desc
  limit p_limit;
$$;
