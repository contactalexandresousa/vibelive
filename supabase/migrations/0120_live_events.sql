-- Eventos ao vivo: sexta rodada do reposicionamento ("as pessoas abrem o
-- app porque tem algo acontecendo, não só pra ver feed infinito"). Qualquer
-- conta pode marcar um evento (não é uma programação central curada — pra
-- uma base de usuários real e pequena, deixar cada criador anunciar o
-- próprio horário é o que realmente vai gerar eventos de verdade). Quem tem
-- interesse marca RSVP; quem aparece na live dentro da janela do evento
-- ganha XP — o "ranking" pedido no brief vira, nesta v1, o ranking por XP
-- que já existe (comunidades, 0119), não um ranking novo e isolado.
create table public.live_events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text check (description is null or char_length(description) <= 300),
  scheduled_at timestamptz not null,
  community_slug text references public.communities(slug),
  challenge_type text check (challenge_type is null or challenge_type in ('danca', 'desenho', 'karaoke', 'culinaria', 'improviso', 'melhor_momento')),
  created_at timestamptz not null default now()
);

create index live_events_scheduled_idx on public.live_events (scheduled_at);

alter table public.live_events enable row level security;

create policy "anyone can read live events"
  on public.live_events for select
  using (true);

create policy "users create their own events"
  on public.live_events for insert
  with check (auth.uid() = host_id);

create policy "hosts delete their own events"
  on public.live_events for delete
  using (auth.uid() = host_id);
-- Sem policy de update nesta v1: cancelar = apagar, editar = apagar e recriar.

create table public.live_event_interests (
  event_id uuid not null references public.live_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.live_event_interests enable row level security;

create policy "anyone can read event interest"
  on public.live_event_interests for select
  using (true);

create policy "users mark their own interest"
  on public.live_event_interests for insert
  with check (auth.uid() = user_id);

create policy "users remove their own interest"
  on public.live_event_interests for delete
  using (auth.uid() = user_id);

create table public.live_event_attendance (
  event_id uuid not null references public.live_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attended_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.live_event_attendance enable row level security;

create policy "anyone can read event attendance"
  on public.live_event_attendance for select
  using (true);
-- Sem insert direto: só a RPC mark_event_attendance (decide o valor de XP
-- internamente e só concede dentro da janela real do evento).

-- Lista eventos futuros (e os que passaram há pouco — o anfitrião pode estar
-- atrasado e já ao vivo) com tudo que o card precisa numa única chamada.
create or replace function public.get_upcoming_live_events(p_limit int default 30)
returns table (
  id uuid,
  host_id uuid,
  host_username text,
  host_display_name text,
  host_avatar_url text,
  title text,
  description text,
  scheduled_at timestamptz,
  community_slug text,
  challenge_type text,
  interested_count bigint,
  is_interested boolean,
  is_live_now boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id, e.host_id, p.username, p.display_name, p.avatar_url,
    e.title, e.description, e.scheduled_at, e.community_slug, e.challenge_type,
    (select count(*) from public.live_event_interests i where i.event_id = e.id),
    exists(select 1 from public.live_event_interests i2 where i2.event_id = e.id and i2.user_id = auth.uid()),
    exists(select 1 from public.live_sessions ls where ls.user_id = e.host_id and ls.ended_at is null)
  from public.live_events e
  join public.profiles p on p.id = e.host_id
  where e.scheduled_at > now() - interval '2 hours'
  order by e.scheduled_at asc
  limit p_limit;
$$;

-- Concede XP uma única vez por (evento, usuário) só quem tinha marcado
-- interesse e entrou na live do anfitrião dentro da janela do evento (15min
-- antes até 90min depois do horário marcado — dá folga pra atraso real).
create or replace function public.mark_event_attendance(p_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_event public.live_events;
  v_xp_awarded int := 0;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_event from public.live_events where id = p_event_id;
  if v_event.id is null then
    raise exception 'Evento não encontrado.';
  end if;

  if now() < v_event.scheduled_at - interval '15 minutes' or now() > v_event.scheduled_at + interval '90 minutes' then
    raise exception 'Fora da janela do evento.';
  end if;

  insert into public.live_event_attendance (event_id, user_id) values (p_event_id, v_uid)
    on conflict do nothing;
  if found then
    perform public._apply_xp(v_uid, 30);
    v_xp_awarded := 30;
  end if;

  return jsonb_build_object('xp_awarded', v_xp_awarded);
end;
$$;
