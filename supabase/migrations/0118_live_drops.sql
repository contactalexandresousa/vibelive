-- Drops surpresa ao vivo: quarta rodada do reposicionamento ("faz as
-- pessoas permanecerem na live"). O anfitrião solta um drop, quem estiver
-- assistindo tem uma janela curta pra tocar e ganhar moedas — limitado a um
-- número de vagas (cria urgência de verdade) e a um cooldown por sala
-- (impede o próprio anfitrião virar uma máquina de imprimir moeda pra
-- contas alternativas colaborando nos claims).
create table public.live_drops (
  id uuid primary key default gen_random_uuid(),
  broadcaster_handle text not null,
  reward_coins int not null default 3,
  max_claims int not null default 10,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index live_drops_room_idx on public.live_drops (broadcaster_handle, created_at desc);

alter table public.live_drops enable row level security;

create policy "anyone can read live drops"
  on public.live_drops for select
  using (true);
-- Sem insert direto: só a RPC trigger_live_drop (confirma que quem chama é
-- de fato o dono da sala, mesmo padrão de create_live_poll).

create table public.live_drop_claims (
  drop_id uuid not null references public.live_drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (drop_id, user_id)
);

alter table public.live_drop_claims enable row level security;

-- Leitura pública necessária pra calcular "quantos já pegaram" em tempo real
-- no cliente — mesmo padrão de live_poll_votes.
create policy "anyone can read drop claims"
  on public.live_drop_claims for select
  using (true);
-- Sem insert direto: só a RPC claim_live_drop grava aqui (decide o valor da
-- recompensa internamente, o cliente nunca manda quantia).

alter publication supabase_realtime add table public.live_drops;
alter publication supabase_realtime add table public.live_drop_claims;

create or replace function public.trigger_live_drop(p_broadcaster_handle text)
returns public.live_drops
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_username text;
  v_last_drop timestamptz;
  v_drop public.live_drops;
begin
  select username into v_username from public.profiles where id = v_uid;
  if v_username is null or v_username <> p_broadcaster_handle then
    raise exception 'Só quem está transmitindo pode soltar um drop nessa live.';
  end if;

  select created_at into v_last_drop from public.live_drops
    where broadcaster_handle = p_broadcaster_handle
    order by created_at desc limit 1;
  if v_last_drop is not null and v_last_drop > now() - interval '60 seconds' then
    raise exception 'Espere um pouco antes de soltar outro drop.';
  end if;

  insert into public.live_drops (broadcaster_handle, expires_at)
    values (p_broadcaster_handle, now() + interval '20 seconds')
    returning * into v_drop;

  return v_drop;
end;
$$;

-- select ... for update trava a linha do drop, então duas pessoas tentando
-- pegar a última vaga ao mesmo tempo serializam nessa checagem — sem isso
-- daria pra "vender" mais vagas que max_claims sob concorrência real.
create or replace function public.claim_live_drop(p_drop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_drop public.live_drops;
  v_claim_count int;
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_drop from public.live_drops where id = p_drop_id for update;
  if v_drop.id is null then
    raise exception 'Esse drop não existe mais.';
  end if;
  if v_drop.expires_at < now() then
    raise exception 'Esse drop já expirou.';
  end if;

  select count(*) into v_claim_count from public.live_drop_claims where drop_id = p_drop_id;
  if v_claim_count >= v_drop.max_claims then
    raise exception 'Esse drop já acabou — foi tudo pego rapidinho!';
  end if;

  insert into public.live_drop_claims (drop_id, user_id) values (p_drop_id, v_uid)
    on conflict do nothing;
  if not found then
    raise exception 'Você já pegou esse drop.';
  end if;

  -- Reaproveita o type 'daily_checkin' do ledger (mesmo padrão já usado pelo
  -- bônus de missões diárias em 0117) em vez de expandir o enum só por isso.
  perform public._credit_coins(v_drop.reward_coins, 'daily_checkin', jsonb_build_object('source', 'live_drop', 'drop_id', p_drop_id));

  select * into v_profile from public.profiles where id = v_uid;
  return jsonb_build_object('profile', to_jsonb(v_profile), 'reward_coins', v_drop.reward_coins);
end;
$$;
