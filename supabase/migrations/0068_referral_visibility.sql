-- Bug real encontrado ao mexer aqui: credit_coins_from_card (0058) nunca
-- dispara o bônus de indicação — só credit_coins_from_pix tem essa lógica.
-- Alguém indicado cuja PRIMEIRA recarga fosse por cartão nunca geraria bônus
-- pra ninguém. Corrige nas duas funções, e o "é a primeira recarga mesmo"
-- passa a contar PIX + cartão juntos (senão dá bônus em dobro pra quem já
-- recarregou por um método e agora recarrega pela primeira vez pelo outro).
create or replace function public.credit_coins_from_pix(p_user_id uuid, p_amount int, p_pix_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer_id uuid;
  v_is_first_recharge boolean;
  v_bonus constant int := 20;
begin
  update public.profiles set coins = coins + p_amount where id = p_user_id;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (p_user_id, p_amount, 'pix_recharge', jsonb_build_object('pix_payment_id', p_pix_payment_id));

  select referred_by into v_referrer_id from public.profiles where id = p_user_id;
  if v_referrer_id is not null then
    select count(*) = 1 into v_is_first_recharge
      from public.wallet_transactions
      where user_id = p_user_id and type in ('pix_recharge', 'card_recharge');

    if v_is_first_recharge then
      update public.profiles set coins = coins + v_bonus where id = p_user_id;
      insert into public.wallet_transactions (user_id, amount, type, metadata)
        values (p_user_id, v_bonus, 'referral_bonus', jsonb_build_object('role', 'referred', 'referrer_id', v_referrer_id));

      update public.profiles set coins = coins + v_bonus where id = v_referrer_id;
      insert into public.wallet_transactions (user_id, amount, type, metadata)
        values (v_referrer_id, v_bonus, 'referral_bonus', jsonb_build_object('role', 'referrer', 'referred_id', p_user_id));
    end if;
  end if;
end;
$$;

create or replace function public.credit_coins_from_card(p_user_id uuid, p_amount int, p_card_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_referrer_id uuid;
  v_is_first_recharge boolean;
  v_bonus constant int := 20;
begin
  update public.profiles set coins = coins + p_amount where id = p_user_id;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (p_user_id, p_amount, 'card_recharge', jsonb_build_object('card_payment_id', p_card_payment_id));

  select referred_by into v_referrer_id from public.profiles where id = p_user_id;
  if v_referrer_id is not null then
    select count(*) = 1 into v_is_first_recharge
      from public.wallet_transactions
      where user_id = p_user_id and type in ('pix_recharge', 'card_recharge');

    if v_is_first_recharge then
      update public.profiles set coins = coins + v_bonus where id = p_user_id;
      insert into public.wallet_transactions (user_id, amount, type, metadata)
        values (p_user_id, v_bonus, 'referral_bonus', jsonb_build_object('role', 'referred', 'referrer_id', v_referrer_id));

      update public.profiles set coins = coins + v_bonus where id = v_referrer_id;
      insert into public.wallet_transactions (user_id, amount, type, metadata)
        values (v_referrer_id, v_bonus, 'referral_bonus', jsonb_build_object('role', 'referrer', 'referred_id', p_user_id));
    end if;
  end if;
end;
$$;

revoke all on function public.credit_coins_from_card(uuid, int, uuid) from public, anon, authenticated;
grant execute on function public.credit_coins_from_card(uuid, int, uuid) to service_role;

-- Visibilidade real do programa: hoje get_my_referral_count só devolve um
-- número cru. Nova RPC traz a lista de quem foi indicado (com quando) e o
-- total ganho em bônus de indicação (soma de wallet_transactions com
-- role='referrer', que já existia mas nunca era somada em lugar nenhum).
create function public.get_my_referrals()
returns table (username text, display_name text, avatar_url text, joined_at timestamptz)
language sql
stable
set search_path = ''
as $$
  select username, display_name, avatar_url, created_at
  from public.profiles
  where referred_by = auth.uid()
  order by created_at desc;
$$;

create function public.get_my_referral_earnings()
returns int
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(amount), 0)::int
  from public.wallet_transactions
  where user_id = auth.uid() and type = 'referral_bonus' and metadata->>'role' = 'referrer';
$$;
