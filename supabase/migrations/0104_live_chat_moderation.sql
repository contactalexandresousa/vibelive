-- Quem transmite não tinha NENHUMA ferramenta pra lidar com um espectador
-- abusivo no chat da própria live — só bloquear a conta inteira (o que
-- exige sair da live pra chegar em Configurações). "Silenciar" barra só o
-- chat (continua assistindo); "remover" barra assistir também, e desconecta
-- na hora via LiveKit RoomServiceClient (função de borda, precisa da
-- Server SDK — client nunca vê API Secret do LiveKit).
create table public.live_room_bans (
  broadcaster_id uuid not null references public.profiles(id) on delete cascade,
  banned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (broadcaster_id, banned_user_id)
);

alter table public.live_room_bans enable row level security;

-- Só o dono da live gerencia/vê a própria lista — a função de borda usa
-- service role (não passa pela RLS) pra fazer o insert/delete de verdade,
-- depois de verificar server-side que quem pediu é o dono da sala.
create policy "broadcaster manages own live bans"
  on public.live_room_bans for all
  using (auth.uid() = broadcaster_id)
  with check (auth.uid() = broadcaster_id);

create table public.live_chat_mutes (
  broadcaster_id uuid not null references public.profiles(id) on delete cascade,
  muted_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (broadcaster_id, muted_user_id)
);

alter table public.live_chat_mutes enable row level security;

create policy "broadcaster manages own live chat mutes"
  on public.live_chat_mutes for all
  using (auth.uid() = broadcaster_id)
  with check (auth.uid() = broadcaster_id);

-- Reforça o silenciamento no servidor (não só escondido na tela) — mesmo
-- padrão de _enforce_dm_block (0023): barra o INSERT direto, mesmo se
-- alguém tentar mandar chat pela API sem passar pelo app.
create function public._enforce_live_chat_mute()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_broadcaster_id uuid;
begin
  select id into v_broadcaster_id from public.profiles where username = new.broadcaster_handle;
  if v_broadcaster_id is not null and exists (
    select 1 from public.live_chat_mutes
    where broadcaster_id = v_broadcaster_id and muted_user_id = new.user_id
  ) then
    raise exception 'Você foi silenciado nesse chat pelo anfitrião.';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_live_chat_mute
  before insert on public.live_chat_messages
  for each row execute function public._enforce_live_chat_mute();
