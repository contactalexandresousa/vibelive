-- Histórico de login (dispositivo/navegador, sem geolocalização — não
-- coletamos IP/local por enquanto). Não existe endpoint de "listar minhas
-- sessões" no Supabase Auth pro cliente comum; o que dá pra oferecer de
-- verdade é: (1) um log próprio de quando/onde a conta logou, e (2) usar
-- sb.auth.signOut({scope:'others'}) — recurso real do GoTrue — pra encerrar
-- todas as sessões exceto a atual.
create table public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_agent text,
  created_at timestamptz not null default now()
);

create index login_events_user_idx on public.login_events (user_id, created_at desc);
alter table public.login_events enable row level security;

create policy "users read own login events"
  on public.login_events for select
  using (auth.uid() = user_id);

create policy "users log own logins"
  on public.login_events for insert
  with check (auth.uid() = user_id);

-- Programa de indicação: reaproveita o próprio username como "código de
-- convite" (já é único, evita criar mais uma coluna/índice). Bônus só é
-- pago na primeira recarga PIX REAL do indicado, nunca no cadastro — pagar
-- no cadastro seria trivialmente farmável criando contas fantasma
-- (mesma preocupação que já levou a zerar o bônus de boas-vindas).
alter table public.profiles add column referred_by uuid references public.profiles(id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_birth_date date;
  v_terms_accepted boolean;
  v_referrer_id uuid;
begin
  v_birth_date := nullif(new.raw_user_meta_data->>'birth_date', '')::date;
  v_terms_accepted := coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false);

  if v_birth_date is not null and age(v_birth_date::timestamp) < interval '18 years' then
    raise exception 'É preciso ter 18 anos ou mais para criar uma conta no VibeLive.';
  end if;

  select id into v_referrer_id from public.profiles
    where username = nullif(new.raw_user_meta_data->>'referred_by_username', '');

  insert into public.profiles (id, username, display_name, birth_date, terms_accepted_at, referred_by)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'visitante_' || substr(new.id::text, 1, 8)),
    coalesce(split_part(new.email, '@', 1), 'Visitante'),
    v_birth_date,
    case when v_terms_accepted then now() else null end,
    v_referrer_id
  );
  return new;
end;
$$;

alter table public.wallet_transactions drop constraint wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in (
    'gift', 'gift_received', 'quick_rose', 'quick_rose_received',
    'pk_support', 'vip_purchase', 'roulette_spin', 'daily_checkin', 'pix_recharge',
    'private_content_unlock', 'private_content_sale',
    'withdrawal_request', 'withdrawal_refund',
    'subscription_charge', 'subscription_income',
    'referral_bonus'
  ));

-- credit_coins_from_pix (0017) só é chamada pela Edge Function do webhook
-- (service role) depois de confirmar o pagamento de verdade no Mercado
-- Pago — ponto certo pra pagar o bônus, sem dar pra forjar do cliente.
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
    -- A inserção acima já aconteceu — se essa é a ÚNICA linha de
    -- pix_recharge do usuário, é a primeira recarga de verdade dele.
    select count(*) = 1 into v_is_first_recharge
      from public.wallet_transactions
      where user_id = p_user_id and type = 'pix_recharge';

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

revoke all on function public.credit_coins_from_pix(uuid, int, uuid) from public, anon, authenticated;
grant execute on function public.credit_coins_from_pix(uuid, int, uuid) to service_role;

create function public.get_my_referral_count()
returns bigint
language sql
stable
set search_path = ''
as $$
  select count(*) from public.profiles where referred_by = auth.uid();
$$;
