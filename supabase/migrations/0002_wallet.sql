-- Ledger de moedas: só leitura direta pelo cliente, toda escrita passa por função.
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null,
  type text not null check (type in (
    'gift', 'quick_rose', 'pk_support', 'vip_purchase',
    'roulette_spin', 'daily_checkin', 'pix_recharge'
  )),
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.wallet_transactions enable row level security;

create policy "users read own transactions"
  on public.wallet_transactions for select
  using (auth.uid() = user_id);
-- Nenhuma policy de insert/update/delete: só as funções SECURITY DEFINER abaixo escrevem aqui.

-- Helper interno: aplica ganho de XP e level-up (mesma regra de app.js: precisa de level*500 xp por nível).
create function public._apply_xp(p_user_id uuid, p_xp_gain int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_xp int;
  v_level int;
  v_needed int;
begin
  select xp, level into v_xp, v_level from public.profiles where id = p_user_id for update;
  v_xp := v_xp + p_xp_gain;
  v_needed := v_level * 500;
  if v_xp >= v_needed then
    v_xp := v_xp - v_needed;
    v_level := v_level + 1;
  end if;
  update public.profiles set xp = v_xp, level = v_level where id = p_user_id;
end;
$$;

-- Debita `p_amount`, valida saldo, grava no ledger. Uso interno pelas RPCs de gasto.
create function public._spend_coins(p_amount int, p_type text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_coins int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select coins into v_coins from public.profiles where id = v_uid for update;
  if v_coins < p_amount then
    raise exception 'Saldo de moedas insuficiente';
  end if;

  update public.profiles set coins = coins - p_amount where id = v_uid;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (v_uid, -p_amount, p_type, p_metadata);
end;
$$;

-- Credita `p_amount`, grava no ledger. Uso interno pelas RPCs de crédito.
create function public._credit_coins(p_amount int, p_type text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  update public.profiles set coins = coins + p_amount where id = v_uid;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (v_uid, p_amount, p_type, p_metadata);
end;
$$;

-- ==========================================================================
-- RPCs públicas: cada uma decide o valor internamente, o cliente nunca manda quantia.
-- Todas retornam o profile atualizado pra UI refletir o estado real do servidor.
-- ==========================================================================

create function public.send_gift(p_gift_code text, p_broadcaster_handle text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price int;
begin
  v_price := case p_gift_code
    when 'rosa' then 1
    when 'chocolate' then 5
    when 'diamante' then 25
    when 'coroa_vip' then 100
    when 'super_carro' then 500
    when 'castelo' then 1000
    else null
  end;
  if v_price is null then
    raise exception 'Presente inválido';
  end if;

  perform public._spend_coins(v_price, 'gift', jsonb_build_object('gift_code', p_gift_code, 'broadcaster', p_broadcaster_handle));
  return (select p from public.profiles p where id = auth.uid());
end;
$$;

create function public.send_quick_rose()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._spend_coins(1, 'quick_rose');
  return (select p from public.profiles p where id = auth.uid());
end;
$$;

create function public.support_pk(p_side text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cost int;
begin
  v_cost := case p_side when 'A' then 1 when 'B' then 25 else null end;
  if v_cost is null then
    raise exception 'Lado inválido';
  end if;
  perform public._spend_coins(v_cost, 'pk_support', jsonb_build_object('side', p_side));
  return (select p from public.profiles p where id = auth.uid());
end;
$$;

create function public.purchase_vip()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_already_vip boolean;
begin
  select is_vip into v_already_vip from public.profiles where id = v_uid;
  if v_already_vip then
    return (select p from public.profiles p where id = v_uid);
  end if;

  perform public._spend_coins(100, 'vip_purchase');
  update public.profiles set is_vip = true where id = v_uid;
  perform public._apply_xp(v_uid, 250);
  return (select p from public.profiles p where id = v_uid);
end;
$$;

create function public.spin_roulette()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_prizes text[] := array['Super Beijo 💖', 'Abraço Virtual 🤗', 'Dueto VIP 👑', 'Parabéns Especial 🎉', 'Mentoria Exclusiva ⭐', 'Tente de Novo 🥱'];
  v_prize text;
  v_profile public.profiles;
begin
  perform public._spend_coins(10, 'roulette_spin');
  v_prize := v_prizes[1 + floor(random() * array_length(v_prizes, 1))::int];
  select p into v_profile from public.profiles p where p.id = v_uid;
  return jsonb_build_object('profile', to_jsonb(v_profile), 'prize', v_prize);
end;
$$;

create function public.redeem_demo_pix(p_package_code text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount int;
begin
  v_amount := case p_package_code
    when 'p50' then 50
    when 'p150' then 150
    when 'p500' then 500
    when 'p1200' then 1200
    else null
  end;
  if v_amount is null then
    raise exception 'Pacote inválido';
  end if;

  perform public._credit_coins(v_amount, 'pix_recharge', jsonb_build_object('package', p_package_code));
  return (select p from public.profiles p where id = auth.uid());
end;
$$;
