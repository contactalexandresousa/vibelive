-- Segue streamers mockados (MOCK_BROADCASTERS em app.js) — por isso followed_handle é
-- texto solto, não FK: essas "contas" continuam sendo dados mockados nesta fase.
create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_handle text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_handle)
);

alter table public.follows enable row level security;

create policy "users read own follows"
  on public.follows for select
  using (auth.uid() = follower_id);

create policy "users manage own follows"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "users remove own follows"
  on public.follows for delete
  using (auth.uid() = follower_id);
