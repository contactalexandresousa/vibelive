-- Batalha PK real: placar e feed de apoio compartilhados de verdade entre todo
-- mundo assistindo, em vez de um placar local que começava falso (12500x10200)
-- e só existia na aba de quem abriu a tela.
create table public.pk_battle_events (
  id uuid primary key default gen_random_uuid(),
  battle_key text not null,
  user_id uuid references public.profiles(id) on delete set null,
  username text not null,
  side text not null check (side in ('A', 'B')),
  points int not null check (points > 0),
  gift_label text not null,
  created_at timestamptz not null default now()
);

create index pk_battle_events_key_idx on public.pk_battle_events (battle_key, created_at);

alter table public.pk_battle_events enable row level security;

create policy "anyone can read pk battle events"
  on public.pk_battle_events for select
  using (true);
-- Sem policy de insert: só a RPC SECURITY DEFINER support_pk escreve aqui
-- (mesmo padrão de live_chat_messages em 0012 — bypassa RLS por rodar como definer).

alter publication supabase_realtime add table public.pk_battle_events;

create or replace function public.support_pk(p_side text, p_battle_key text default 'moranguinho_vs_luana')
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cost int;
  v_points int;
  v_gift_label text;
  v_uid uuid := auth.uid();
  v_username text;
begin
  v_cost := case p_side when 'A' then 1 when 'B' then 25 else null end;
  if v_cost is null then
    raise exception 'Lado inválido';
  end if;
  v_points := case p_side when 'A' then 100 else 250 end;
  v_gift_label := case p_side when 'A' then 'Rosa 🌹' else 'Diamante 💎' end;

  perform public._spend_coins(v_cost, 'pk_support', jsonb_build_object('side', p_side));

  select coalesce(display_name, username) into v_username from public.profiles where id = v_uid;
  insert into public.pk_battle_events (battle_key, user_id, username, side, points, gift_label)
    values (p_battle_key, v_uid, v_username, p_side, v_points, v_gift_label);

  return (select p from public.profiles p where id = v_uid);
end;
$$;
