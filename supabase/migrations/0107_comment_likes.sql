-- Comentário não tinha nenhum sinal de engajamento, só resposta (0091).
-- Mesmo modelo de post_likes (0005): público pra leitura/contagem, cada um
-- só grava a própria curtida.
create table public.comment_likes (
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_likes enable row level security;

create policy "comment likes are publicly readable"
  on public.comment_likes for select
  using (true);

create policy "users like comments as themselves"
  on public.comment_likes for insert
  with check (auth.uid() = user_id);

create policy "users unlike their own comment likes"
  on public.comment_likes for delete
  using (auth.uid() = user_id);
