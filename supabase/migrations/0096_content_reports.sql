-- Hoje só dá pra denunciar um USUÁRIO inteiro (0023) — o painel de moderação
-- (0078) não tem como saber qual post ou comentário específico motivou o
-- problema. Denúncia de conteúdo aponta pra uma linha exata (post OU
-- comentário, nunca os dois — dá pra reaproveitar o cascade de FK em vez de
-- um content_type/content_id solto sem integridade referencial).
create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.post_comments(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  check ((post_id is not null and comment_id is null) or (post_id is null and comment_id is not null))
);

alter table public.content_reports enable row level security;

create policy "users create their own content reports"
  on public.content_reports for insert
  with check (auth.uid() = reporter_id);

create policy "users view their own submitted content reports"
  on public.content_reports for select
  using (auth.uid() = reporter_id);

-- Mesmo limite (5/hora) e mesmo padrão de trigger de public.user_reports (0043),
-- só que num bucket de rate-limit separado — denunciar 5 usuários E 5
-- posts na mesma hora continua permitido, são abusos diferentes.
create function public._enforce_content_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._check_and_log_rate_limit('report_content', 5, interval '1 hour');
  return new;
end;
$$;

create trigger trg_rate_limit_content_reports
  before insert on public.content_reports
  for each row execute function public._enforce_content_report_rate_limit();

-- Mesmo padrão de get_moderation_blocks (0078): só admin, resolve os nomes
-- pra não obrigar o painel a fazer mais uma chamada. media_urls[1] cobre
-- carrossel (0079) quando media_url (a primeira foto, mantida por
-- compatibilidade) não existir por algum motivo.
create function public.get_content_reports(p_limit int default 50)
returns table (
  id uuid,
  reporter_username text,
  reason text,
  created_at timestamptz,
  content_type text,
  post_id uuid,
  post_caption text,
  post_media_url text,
  post_author_username text,
  comment_id uuid,
  comment_text text,
  comment_author_username text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem ver isso.';
  end if;

  return query
    select
      cr.id,
      rp.username,
      cr.reason,
      cr.created_at,
      case when cr.post_id is not null then 'post' else 'comment' end,
      p.id,
      p.caption,
      coalesce(p.media_url, p.media_urls[1]),
      pa.username,
      c.id,
      c.text,
      ca.username
    from public.content_reports cr
    join public.profiles rp on rp.id = cr.reporter_id
    left join public.posts p on p.id = cr.post_id
    left join public.profiles pa on pa.id = p.user_id
    left join public.post_comments c on c.id = cr.comment_id
    left join public.profiles ca on ca.id = c.user_id
    order by cr.created_at desc
    limit p_limit;
end;
$$;
