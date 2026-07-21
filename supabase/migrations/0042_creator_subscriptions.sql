-- Assinatura mensal recorrente de verdade, além do desbloqueio único que já
-- existia (migration 0032). Continua sem cobrança recorrente via PIX (Mercado
-- Pago só cobra recorrência com cartão, fora do escopo aqui) — a "recorrência"
-- acontece dentro da própria economia de moedas do app: todo dia, um job
-- verifica assinaturas vencidas e tenta debitar de novo automaticamente. Sem
-- saldo suficiente, a assinatura expira sozinha (sem loop de cobrança, sem
-- dívida — o pior caso é perder o acesso, nunca ficar negativo).
alter table public.profiles add column subscription_price_coins int;

create table public.creator_subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  price_coins int not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  cancel_at_period_end boolean not null default false,
  current_period_end timestamptz not null,
  created_at timestamptz not null default now(),
  unique (subscriber_id, creator_id)
);

create index creator_subscriptions_renewal_idx on public.creator_subscriptions (current_period_end)
  where status = 'active';

alter table public.creator_subscriptions enable row level security;

create policy "subscriber or creator can read subscription"
  on public.creator_subscriptions for select
  using (auth.uid() = subscriber_id or auth.uid() = creator_id);
-- Sem policy de insert/update: só as RPCs abaixo escrevem (débito de moedas
-- precisa ser atômico com a criação/renovação da assinatura).

alter table public.wallet_transactions drop constraint wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in (
    'gift', 'gift_received', 'quick_rose', 'quick_rose_received',
    'pk_support', 'vip_purchase', 'roulette_spin', 'daily_checkin', 'pix_recharge',
    'private_content_unlock', 'private_content_sale',
    'withdrawal_request', 'withdrawal_refund',
    'subscription_charge', 'subscription_income'
  ));

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_follower', 'went_live', 'live_invite', 'withdrawal_reviewed', 'subscription_expired'));

-- Amplia o gate de conteúdo privado (0032): além do desbloqueio único, uma
-- assinatura ativa (não vencida) também dá acesso.
drop policy "public posts are readable by anyone, private posts only by unlockers" on public.posts;

create policy "public posts readable by anyone, private posts by unlockers or subscribers"
  on public.posts for select
  using (
    not is_private
    or auth.uid() = user_id
    or exists (
      select 1 from public.private_content_unlocks u
      where u.creator_id = posts.user_id and u.unlocker_id = auth.uid()
    )
    or exists (
      select 1 from public.creator_subscriptions s
      where s.creator_id = posts.user_id and s.subscriber_id = auth.uid()
        and s.status = 'active' and s.current_period_end > now()
    )
  );

create function public.subscribe_to_creator(p_creator_id uuid)
returns public.creator_subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_price int;
  v_existing public.creator_subscriptions;
  v_sub public.creator_subscriptions;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if v_uid = p_creator_id then
    raise exception 'Você já tem acesso ao próprio conteúdo';
  end if;

  select subscription_price_coins into v_price from public.profiles where id = p_creator_id;
  if v_price is null or v_price <= 0 then
    raise exception 'Esse criador não oferece assinatura mensal.';
  end if;

  -- Clique duplo em quem já é assinante ativo não cobra de novo — só desfaz
  -- um cancelamento agendado, se houver.
  select * into v_existing from public.creator_subscriptions
    where subscriber_id = v_uid and creator_id = p_creator_id;
  if v_existing.id is not null and v_existing.status = 'active' and v_existing.current_period_end > now() then
    update public.creator_subscriptions set cancel_at_period_end = false where id = v_existing.id
      returning * into v_sub;
    return v_sub;
  end if;

  perform public._spend_coins(v_price, 'subscription_charge', jsonb_build_object('creator_id', p_creator_id));
  perform public._credit_coins_to(p_creator_id, v_price, 'subscription_income', jsonb_build_object('subscriber', v_uid));

  insert into public.creator_subscriptions (subscriber_id, creator_id, price_coins, status, cancel_at_period_end, current_period_end)
    values (v_uid, p_creator_id, v_price, 'active', false, now() + interval '30 days')
    on conflict (subscriber_id, creator_id) do update
      set price_coins = excluded.price_coins, status = 'active', cancel_at_period_end = false,
          current_period_end = now() + interval '30 days'
    returning * into v_sub;

  return v_sub;
end;
$$;

-- Cancelar não corta o acesso na hora — só impede a renovação automática no
-- fim do período já pago (mesmo padrão de qualquer assinatura SaaS real).
create function public.cancel_subscription(p_creator_id uuid)
returns public.creator_subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_sub public.creator_subscriptions;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  update public.creator_subscriptions
  set cancel_at_period_end = true
  where subscriber_id = v_uid and creator_id = p_creator_id and status = 'active'
  returning * into v_sub;

  if v_sub.id is null then
    raise exception 'Assinatura não encontrada.';
  end if;
  return v_sub;
end;
$$;

create extension if not exists pg_cron;

create function public._process_subscription_renewals()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub record;
  v_balance int;
begin
  for v_sub in
    select * from public.creator_subscriptions
    where status = 'active' and current_period_end <= now()
  loop
    if v_sub.cancel_at_period_end then
      update public.creator_subscriptions set status = 'expired' where id = v_sub.id;
      continue;
    end if;

    select coins into v_balance from public.profiles where id = v_sub.subscriber_id for update;
    if v_balance is null or v_balance < v_sub.price_coins then
      update public.creator_subscriptions set status = 'expired' where id = v_sub.id;
      insert into public.notifications (user_id, type, metadata)
        values (v_sub.subscriber_id, 'subscription_expired', jsonb_build_object('creator_id', v_sub.creator_id));
      continue;
    end if;

    perform public._credit_coins_to(v_sub.subscriber_id, -v_sub.price_coins, 'subscription_charge',
      jsonb_build_object('creator_id', v_sub.creator_id, 'renewal', true));
    perform public._credit_coins_to(v_sub.creator_id, v_sub.price_coins, 'subscription_income',
      jsonb_build_object('subscriber', v_sub.subscriber_id, 'renewal', true));

    update public.creator_subscriptions
    set current_period_end = current_period_end + interval '30 days'
    where id = v_sub.id;
  end loop;
end;
$$;

select cron.schedule('process-subscription-renewals', '0 3 * * *', $$select public._process_subscription_renewals();$$);

create or replace function public._push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_name text;
  v_title text;
  v_body text;
  v_status text;
  v_coins int;
  v_creator_name text;
begin
  select coalesce(display_name, username) into v_actor_name from public.profiles where id = new.actor_id;
  v_actor_name := coalesce(v_actor_name, 'Alguém');

  if new.type = 'withdrawal_reviewed' then
    v_status := new.metadata->>'status';
    v_coins := (new.metadata->>'coins_amount')::int;
    v_title := 'Saque atualizado';
    v_body := case v_status
      when 'paid' then 'Seu saque de 🪙' || v_coins || ' foi pago!'
      when 'approved' then 'Seu saque de 🪙' || v_coins || ' foi aprovado.'
      when 'rejected' then 'Seu saque de 🪙' || v_coins || ' foi rejeitado — as moedas voltaram pra sua carteira.'
      else 'Seu pedido de saque foi atualizado.'
    end;
    perform public._send_push(new.user_id, v_title, v_body);
    return new;
  end if;

  if new.type = 'subscription_expired' then
    select coalesce(display_name, username) into v_creator_name
      from public.profiles where id = (new.metadata->>'creator_id')::uuid;
    perform public._send_push(new.user_id, 'Assinatura expirou',
      'Sua assinatura de ' || coalesce(v_creator_name, 'um criador') || ' expirou por falta de saldo.');
    return new;
  end if;

  v_title := case new.type
    when 'new_follower' then 'Novo seguidor'
    when 'live_invite' then 'Convite pra live'
    when 'went_live' then 'Live agora'
    else 'VibeLive'
  end;
  v_body := case new.type
    when 'new_follower' then v_actor_name || ' começou a seguir você'
    when 'live_invite' then v_actor_name || ' te convidou pra uma live restrita'
    when 'went_live' then v_actor_name || ' está ao vivo agora!'
    else 'Você tem uma novidade no VibeLive.'
  end;

  perform public._send_push(new.user_id, v_title, v_body);
  return new;
end;
$$;
