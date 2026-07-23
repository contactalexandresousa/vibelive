-- Comunidades: quinta rodada do reposicionamento, e a maior — em vez de só
-- seguir pessoas, entrar num grupo por interesse (Anime, Funk, Valorant...).
-- Lista fixa (mesmo padrão de LIVE_CATEGORIES/CHALLENGE_TYPES no cliente),
-- não criada por usuário — evita todo o problema de moderação de comunidade
-- gerada por usuário, que é escopo próprio.
--
-- v1 propositalmente menor que o pedido original ("lives, posts, ranking,
-- eventos, salas de voz"): eventos (agenda/notificação/RSVP) e salas de voz
-- (um tipo de sala LiveKit inteiramente novo, só áudio, múltiplos falantes)
-- são cada um uma feature própria — ficam pra rodadas futuras. Esta cobre
-- entrar/sair, feed agregado (lives + posts já marcados com a comunidade) e
-- ranking por XP entre os membros.
create table public.communities (
  slug text primary key,
  name text not null,
  icon text not null
);

alter table public.communities enable row level security;

create policy "anyone can read communities"
  on public.communities for select
  using (true);

insert into public.communities (slug, name, icon) values
  ('anime', 'Anime', '🎌'),
  ('funk', 'Funk', '🎵'),
  ('futebol', 'Futebol', '⚽'),
  ('academia', 'Academia', '💪'),
  ('minecraft', 'Minecraft', '⛏️'),
  ('valorant', 'Valorant', '🎯'),
  ('games', 'Games (geral)', '🎮'),
  ('musica', 'Música', '🎧'),
  ('arte', 'Arte', '🎨'),
  ('culinaria', 'Culinária', '🍳');

create table public.community_members (
  community_slug text not null references public.communities(slug) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (community_slug, user_id)
);

create index community_members_user_idx on public.community_members (user_id);

alter table public.community_members enable row level security;

create policy "anyone can read community membership"
  on public.community_members for select
  using (true);

-- Entrar/sair não é dado sensível (nem operação de carteira) — RLS por dono
-- da linha basta, mesmo padrão de "members can leave a group" em 0114.
create policy "users join communities themselves"
  on public.community_members for insert
  with check (auth.uid() = user_id);

create policy "users leave communities themselves"
  on public.community_members for delete
  using (auth.uid() = user_id);

-- Posts e lives ganham marcação opcional de comunidade — mesmo padrão de
-- live_sessions.category (0103), sem quebrar nenhuma linha já existente
-- (fica null = "sem comunidade", continua aparecendo em todo o resto do app
-- normalmente).
alter table public.posts add column community_slug text references public.communities(slug);
create index posts_community_idx on public.posts (community_slug, created_at desc) where community_slug is not null;

alter table public.live_sessions add column community_slug text references public.communities(slug);
create index live_sessions_community_idx on public.live_sessions (community_slug) where community_slug is not null and ended_at is null;

-- Lista todas as comunidades já com contagem de membros e se EU sou membro —
-- evita N+1 query na tela de "descobrir comunidades".
create or replace function public.get_communities_with_counts()
returns table (
  slug text,
  name text,
  icon text,
  member_count bigint,
  is_member boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.slug, c.name, c.icon,
    (select count(*) from public.community_members m where m.community_slug = c.slug),
    exists(select 1 from public.community_members m2 where m2.community_slug = c.slug and m2.user_id = auth.uid())
  from public.communities c
  order by c.name;
$$;

-- Ranking por XP entre os membros — reaproveita profiles.xp já existente,
-- nenhum contador novo por comunidade nesta v1.
create or replace function public.get_community_ranking(p_slug text, p_limit int default 20)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  xp int,
  level int
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.xp, p.level
  from public.community_members cm
  join public.profiles p on p.id = cm.user_id
  where cm.community_slug = p_slug
  order by p.xp desc
  limit p_limit;
$$;
