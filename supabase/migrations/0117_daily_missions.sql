-- Missões diárias: terceira rodada do reposicionamento ("motivo de voltar
-- todo dia"). Em vez de duplicar contadores que já existem, 3 das 4 missões
-- são calculadas em cima de tabelas já existentes (posts, direct_messages,
-- post_likes) — só "assistir live" precisa de um registro novo, porque não
-- existe hoje nenhum rastro persistido de "fulano assistiu a live X".
create table public.daily_mission_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_type text not null check (mission_type in ('watch_live')),
  event_date date not null default current_date,
  target_id text not null, -- room_name da live assistida — evita contar a mesma live 2x
  created_at timestamptz not null default now(),
  primary key (user_id, mission_type, event_date, target_id)
);

alter table public.daily_mission_events enable row level security;

create policy "users read own mission events"
  on public.daily_mission_events for select
  using (auth.uid() = user_id);
-- Sem policy de insert: só a RPC log_watch_live_mission grava aqui.

create table public.daily_mission_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  claim_date date not null default current_date,
  primary key (user_id, claim_date)
);

alter table public.daily_mission_claims enable row level security;

create policy "users read own mission claims"
  on public.daily_mission_claims for select
  using (auth.uid() = user_id);

create or replace function public.log_watch_live_mission(p_room_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;
  insert into public.daily_mission_events (user_id, mission_type, target_id)
    values (v_uid, 'watch_live', p_room_name)
    on conflict do nothing;
end;
$$;

create or replace function public.get_daily_missions_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_watched int;
  v_posted int;
  v_chatted int;
  v_liked int;
  v_claimed boolean;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select count(distinct target_id) into v_watched
    from public.daily_mission_events
    where user_id = v_uid and mission_type = 'watch_live' and event_date = current_date;

  select count(*) into v_posted
    from public.posts
    where user_id = v_uid and created_at::date = current_date;

  select count(distinct recipient_id) into v_chatted
    from public.direct_messages
    where sender_id = v_uid and created_at::date = current_date;

  select count(*) into v_liked
    from public.post_likes pl
    join public.posts p on p.id = pl.post_id
    where p.user_id = v_uid and pl.created_at::date = current_date;

  select exists(
    select 1 from public.daily_mission_claims where user_id = v_uid and claim_date = current_date
  ) into v_claimed;

  return jsonb_build_object(
    'watch_live', jsonb_build_object('progress', least(v_watched, 2), 'target', 2),
    'post', jsonb_build_object('progress', least(v_posted, 1), 'target', 1),
    'chat', jsonb_build_object('progress', least(v_chatted, 3), 'target', 3),
    'likes_received', jsonb_build_object('progress', least(v_liked, 20), 'target', 20),
    'all_complete', v_watched >= 2 and v_posted >= 1 and v_chatted >= 3 and v_liked >= 20,
    'bonus_claimed', v_claimed
  );
end;
$$;

-- Reaproveita o mesmo type 'daily_checkin' do ledger (0002) em vez de
-- expandir o enum só por essa origem — metadata.source distingue de onde veio.
create or replace function public.claim_daily_missions_bonus()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_progress jsonb;
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  v_progress := public.get_daily_missions_progress();
  if not (v_progress->>'all_complete')::boolean then
    raise exception 'Ainda faltam missões para completar hoje.';
  end if;
  if (v_progress->>'bonus_claimed')::boolean then
    raise exception 'Você já resgatou o bônus de hoje.';
  end if;

  insert into public.daily_mission_claims (user_id) values (v_uid);
  perform public._credit_coins(30, 'daily_checkin', jsonb_build_object('source', 'daily_missions'));
  perform public._apply_xp(v_uid, 50);

  select * into v_profile from public.profiles where id = v_uid;
  return jsonb_build_object('profile', to_jsonb(v_profile));
end;
$$;
