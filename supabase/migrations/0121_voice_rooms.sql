-- Salas de voz: sétima e última rodada do reposicionamento original — o
-- único item que sobrou (comunidades, desafios, perfil vivo, missões,
-- drops e eventos já saíram nas rodadas anteriores). Modelo Clubhouse/
-- Twitter Spaces simples: o anfitrião fala, quem entra começa como ouvinte
-- (sem publicar áudio), levanta a mão pra pedir a vez, o anfitrião promove.
-- Tabela paralela a live_sessions (não reaproveitada): semântica é
-- fundamentalmente diferente — múltiplos falantes simultâneos, sem vídeo,
-- com papel (host/speaker/listener) por participante.
create table public.voice_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  room_name text not null unique,
  title text not null check (char_length(title) between 1 and 80),
  community_slug text references public.communities(slug),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index voice_rooms_one_active_per_host
  on public.voice_rooms (host_id)
  where ended_at is null;

create index voice_rooms_active_idx on public.voice_rooms (started_at desc) where ended_at is null;

alter table public.voice_rooms enable row level security;

create policy "anyone can read voice rooms"
  on public.voice_rooms for select
  using (true);

create policy "users start their own voice room"
  on public.voice_rooms for insert
  with check (auth.uid() = host_id);

create policy "users end their own voice room"
  on public.voice_rooms for update
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

create table public.voice_room_participants (
  room_id uuid not null references public.voice_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'listener' check (role in ('host', 'speaker', 'listener')),
  hand_raised boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index voice_room_participants_room_idx on public.voice_room_participants (room_id);

alter table public.voice_room_participants enable row level security;

create policy "anyone can read voice room participants"
  on public.voice_room_participants for select
  using (true);
-- Sem insert/update/delete direto: entrar, sair, levantar a mão e promover/
-- rebaixar são só pelas RPCs abaixo — promover exige checar que quem chama
-- é o anfitrião, o que uma policy simples de dono-da-linha não expressa.

alter publication supabase_realtime add table public.voice_rooms;
alter publication supabase_realtime add table public.voice_room_participants;

create or replace function public.join_voice_room(p_room_id uuid)
returns public.voice_room_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.voice_rooms;
  v_role text;
  v_row public.voice_room_participants;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_room from public.voice_rooms where id = p_room_id and ended_at is null;
  if v_room.id is null then
    raise exception 'Essa sala não está mais ativa.';
  end if;

  v_role := case when v_room.host_id = v_uid then 'host' else 'listener' end;

  insert into public.voice_room_participants (room_id, user_id, role)
    values (p_room_id, v_uid, v_role)
    on conflict (room_id, user_id) do update set role = public.voice_room_participants.role
    returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.leave_voice_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  delete from public.voice_room_participants where room_id = p_room_id and user_id = v_uid;
end;
$$;

create or replace function public.set_hand_raised(p_room_id uuid, p_raised boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  update public.voice_room_participants
  set hand_raised = p_raised
  where room_id = p_room_id and user_id = v_uid and role = 'listener';
end;
$$;

-- Só o anfitrião promove/rebaixa — a checagem fica na função em vez de RLS
-- porque a policy precisaria olhar pra OUTRA linha (a do dono da sala) pra
-- autorizar mexer NESTA linha (a do participante), o que RLS não expressa
-- direto sem uma subquery em cima da própria tabela protegida (mesmo tipo
-- de armadilha de recursão já resolvido em 0115 — aqui evitamos de saída).
create or replace function public.promote_to_speaker(p_room_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not exists (select 1 from public.voice_rooms where id = p_room_id and host_id = v_uid and ended_at is null) then
    raise exception 'Só o anfitrião pode promover alguém a falante.';
  end if;
  update public.voice_room_participants
  set role = 'speaker', hand_raised = false
  where room_id = p_room_id and user_id = p_user_id;
end;
$$;

create or replace function public.demote_to_listener(p_room_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not exists (select 1 from public.voice_rooms where id = p_room_id and host_id = v_uid and ended_at is null) then
    raise exception 'Só o anfitrião pode tirar alguém da fala.';
  end if;
  update public.voice_room_participants
  set role = 'listener', hand_raised = false
  where room_id = p_room_id and user_id = p_user_id and role = 'speaker';
end;
$$;

create or replace function public.end_voice_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  update public.voice_rooms set ended_at = now()
  where id = p_room_id and host_id = v_uid and ended_at is null;
  if not found then
    raise exception 'Só o anfitrião pode encerrar essa sala.';
  end if;
  delete from public.voice_room_participants where room_id = p_room_id;
end;
$$;

create or replace function public.get_active_voice_rooms()
returns table (
  id uuid,
  host_id uuid,
  room_name text,
  title text,
  community_slug text,
  host_username text,
  host_display_name text,
  host_avatar_url text,
  participant_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id, r.host_id, r.room_name, r.title, r.community_slug,
    p.username, p.display_name, p.avatar_url,
    (select count(*) from public.voice_room_participants vp where vp.room_id = r.id)
  from public.voice_rooms r
  join public.profiles p on p.id = r.host_id
  where r.ended_at is null
  order by r.started_at desc;
$$;
