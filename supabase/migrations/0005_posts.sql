-- Posts reais do usuário. Os 2 posts de exemplo do protótipo (app.js) NÃO são migrados:
-- toda conta nova começa com 0 posts, já que os autores de comentário mockados
-- ("gabi.silva", "moranguinho") não existem como contas reais.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text default '',
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "posts are publicly readable"
  on public.posts for select
  using (true);

create policy "users create own posts"
  on public.posts for insert
  with check (auth.uid() = user_id);

-- Curtidas: linha = curtida. likes_count nunca é uma coluna gravável — sempre count() na leitura.
create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

create policy "likes are publicly readable"
  on public.post_likes for select
  using (true);

create policy "users like as themselves"
  on public.post_likes for insert
  with check (auth.uid() = user_id);

create policy "users unlike their own like"
  on public.post_likes for delete
  using (auth.uid() = user_id);

-- Comentários: inseridos só via RPC abaixo, porque comentar concede XP (mesma regra do app.js:
-- addLightboxComment chama addXP(15)) e isso precisa ser atômico com a escrita do comentário.
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.post_comments enable row level security;

create policy "comments are publicly readable"
  on public.post_comments for select
  using (true);
-- Sem policy de insert: só a função abaixo escreve (concede XP atomicamente).

create function public.add_post_comment(p_post_id uuid, p_text text)
returns public.post_comments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_comment public.post_comments;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if trim(p_text) = '' then
    raise exception 'Comentário vazio';
  end if;

  insert into public.post_comments (post_id, user_id, text)
    values (p_post_id, v_uid, p_text)
    returning * into v_comment;

  perform public._apply_xp(v_uid, 15);

  return v_comment;
end;
$$;
