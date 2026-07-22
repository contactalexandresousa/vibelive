-- Stories: foto/vídeo que fica visível só por 24h, no topo do Discover.
-- Mesmo modelo de storage já aceito pra post/DM media (0028/0062): bucket
-- público, mas só quem sabe a URL exata acessa — a privacidade de verdade
-- (só seguidores veem) é reforçada na RLS da tabela stories, não no bucket.
insert into storage.buckets (id, name, public, file_size_limit)
values ('stories', 'stories', true, 26214400) -- 25MB
on conflict (id) do nothing;

create policy "story media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'stories');

create policy "users can upload their own story media"
  on storage.objects for insert
  with check (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own story media"
  on storage.objects for delete
  using (bucket_id = 'stories' and (storage.foldername(name))[1] = auth.uid()::text);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index stories_user_idx on public.stories (user_id, created_at desc);
create index stories_expires_idx on public.stories (expires_at);

alter table public.stories enable row level security;

-- Story só é visível pro próprio dono ou pra quem segue — diferente de post
-- (sempre público), story é o conteúdo mais "íntimo" do app por natureza.
create policy "stories visible to self and followers"
  on public.stories for select
  using (
    expires_at > now()
    and (
      auth.uid() = user_id
      or exists (
        select 1 from public.follows f
        join public.profiles p on p.username = f.followed_handle
        where f.follower_id = auth.uid() and p.id = stories.user_id
      )
    )
  );

create policy "users create own stories"
  on public.stories for insert
  with check (auth.uid() = user_id);

create policy "users delete own stories"
  on public.stories for delete
  using (auth.uid() = user_id);

-- Mesmo padrão de rate limit de post (0082) — sem isso um script logado
-- podia inundar o storage com stories via chamada direta à API.
create function public._enforce_story_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._check_and_log_rate_limit('create_story', 20, interval '1 hour');
  return new;
end;
$$;

create trigger trg_rate_limit_stories
  before insert on public.stories
  for each row execute function public._enforce_story_rate_limit();

create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

alter table public.story_views enable row level security;

create policy "story owner or viewer reads views"
  on public.story_views for select
  using (
    viewer_id = auth.uid()
    or exists (select 1 from public.stories where id = story_id and user_id = auth.uid())
  );

create policy "viewers mark their own view"
  on public.story_views for insert
  with check (auth.uid() = viewer_id);

create function public.mark_story_viewed(p_story_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  insert into public.story_views (story_id, viewer_id)
    values (p_story_id, auth.uid())
    on conflict (story_id, viewer_id) do nothing;
end;
$$;

-- Uma linha por autor (não por story) — agrupa pra renderizar os círculos do
-- carrossel do topo do Discover. has_unseen decide o anel colorido vs
-- apagado; a ordenação prioriza: eu mesmo primeiro, depois quem tem story
-- não vista, depois mais recente.
create function public.get_stories_feed()
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  latest_story_at timestamptz,
  story_count int,
  has_unseen boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  return query
    select p.id, p.username, p.display_name, p.avatar_url,
      max(s.created_at) as latest_story_at,
      count(s.id)::int as story_count,
      bool_or(sv.viewer_id is null) as has_unseen
    from public.stories s
    join public.profiles p on p.id = s.user_id
    left join public.story_views sv on sv.story_id = s.id and sv.viewer_id = v_uid
    where s.expires_at > now()
      and (
        s.user_id = v_uid
        or exists (select 1 from public.follows f where f.follower_id = v_uid and f.followed_handle = p.username)
      )
    group by p.id, p.username, p.display_name, p.avatar_url
    order by (p.id = v_uid) desc, has_unseen desc, latest_story_at desc;
end;
$$;

-- Stories de um autor específico, em ordem cronológica, pra tocar em
-- sequência no visualizador — mesma checagem de "sou eu ou sigo" da RLS,
-- reafirmada aqui porque SECURITY DEFINER roda como dono e não passa pela RLS.
create function public.get_user_stories(p_user_id uuid)
returns setof public.stories
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_can_view boolean;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if v_uid = p_user_id then
    v_can_view := true;
  else
    select exists(
      select 1 from public.follows f
      join public.profiles p on p.username = f.followed_handle
      where f.follower_id = v_uid and p.id = p_user_id
    ) into v_can_view;
  end if;

  if not v_can_view then
    raise exception 'Você não pode ver os stories dessa conta.';
  end if;

  return query
    select * from public.stories
    where user_id = p_user_id and expires_at > now()
    order by created_at asc;
end;
$$;
