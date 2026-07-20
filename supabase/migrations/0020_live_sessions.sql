-- Rastreia quem está transmitindo de verdade agora (vídeo real via LiveKit),
-- separado dos MOCK_BROADCASTERS estáticos (Moranguinho, Luana Becker etc.),
-- que continuam sendo dados de demonstração sem conta real por trás.
create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_name text not null,
  title text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Garante no máximo uma sessão ativa por usuário por vez.
create unique index live_sessions_one_active_per_user
  on public.live_sessions (user_id)
  where ended_at is null;

create index live_sessions_active_idx on public.live_sessions (started_at desc) where ended_at is null;

alter table public.live_sessions enable row level security;

-- Qualquer um (inclusive visitante não logado) pode ver quem está ao vivo agora.
create policy "anyone can read live sessions"
  on public.live_sessions for select
  using (true);

-- Cada usuário só cria/encerra a própria sessão — não é operação de carteira,
-- então não precisa de RPC SECURITY DEFINER, só RLS por dono da linha.
create policy "users start their own live session"
  on public.live_sessions for insert
  with check (auth.uid() = user_id);

create policy "users end their own live session"
  on public.live_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.live_sessions;
