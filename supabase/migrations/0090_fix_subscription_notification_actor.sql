-- 0089 esqueceu actor_id nos dois inserts de notificação de assinatura — o
-- join manual do cliente (getNotifications) resolve nome/avatar do criador
-- a partir de actor_id, então sem isso as duas notificações caíam sempre no
-- case genérico errado ("está ao vivo agora!"). Pego em revisão antes de
-- testar de verdade — 0089 já tinha sido aplicada, por isso a correção vem
-- numa migração própria em vez de editar ela no lugar.
create or replace function public._warn_upcoming_subscription_renewals()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sub record;
begin
  for v_sub in
    select * from public.creator_subscriptions
    where status = 'active' and cancel_at_period_end = false
      and current_period_end > now() and current_period_end <= now() + interval '24 hours'
  loop
    insert into public.notifications (user_id, type, actor_id, metadata)
      values (v_sub.subscriber_id, 'subscription_renewing_soon', v_sub.creator_id,
        jsonb_build_object('creator_id', v_sub.creator_id, 'price_coins', v_sub.price_coins));
  end loop;
end;
$$;

create or replace function public._process_subscription_renewals()
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
      insert into public.notifications (user_id, type, actor_id, metadata)
        values (v_sub.subscriber_id, 'subscription_expired', v_sub.creator_id, jsonb_build_object('creator_id', v_sub.creator_id));
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
