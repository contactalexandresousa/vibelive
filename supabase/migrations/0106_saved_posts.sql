-- Não existe forma de guardar um post pra ver depois — só curtir (que também
-- é público, contador visível pra qualquer um). "Salvo" é sempre privado:
-- nenhuma policy de select cruzada, só o próprio dono lê a própria lista —
-- diferente de post_likes, aqui não existe contagem pública nem de "quem salvou".
create table public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.saved_posts enable row level security;

create policy "users manage their own saved posts"
  on public.saved_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
