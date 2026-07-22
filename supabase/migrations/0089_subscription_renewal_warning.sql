-- Assinatura de criador cobra automaticamente todo mês (cron às 3h,
-- _process_subscription_renewals) mas só notifica DEPOIS de falhar por
-- saldo insuficiente — quem não tava de olho no saldo perdia o acesso sem
-- aviso nenhum. Roda um pouco antes da cobrança, avisando quem renova nas
-- próximas 24h. A janela (period_end > now() e <= now()+24h) garante aviso
-- exatamente uma vez por ciclo: no dia seguinte, o mesmo period_end já não
-- cai mais na janela (ou já foi renovado e empurrado 30 dias pra frente,
-- ou expirou por saldo insuficiente).
create function public._warn_upcoming_subscription_renewals()
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
    insert into public.notifications (user_id, type, metadata)
      values (v_sub.subscriber_id, 'subscription_renewing_soon',
        jsonb_build_object('creator_id', v_sub.creator_id, 'price_coins', v_sub.price_coins));
  end loop;
end;
$$;

select cron.schedule('warn-subscription-renewals', '30 2 * * *', $$select public._warn_upcoming_subscription_renewals();$$);

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_follower', 'went_live', 'live_invite', 'withdrawal_reviewed', 'subscription_expired', 'cohost_invite', 'missed_call', 'post_like', 'post_comment', 'gift_received', 'subscription_renewing_soon'));

alter table public.profiles alter column push_preferences set default
  '{"new_follower": true, "went_live": true, "live_invite": true, "direct_message": true, "withdrawal_reviewed": true, "subscription_expired": true, "post_like": true, "post_comment": true, "gift_received": true, "subscription_renewing_soon": true}'::jsonb;

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
  v_prefs jsonb;
  v_gift_label text;
begin
  select push_preferences into v_prefs from public.profiles where id = new.user_id;
  if coalesce((v_prefs->>new.type)::boolean, true) = false then
    return new; -- usuário desativou push pra esse tipo específico
  end if;

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

  if new.type = 'subscription_renewing_soon' then
    select coalesce(display_name, username) into v_creator_name
      from public.profiles where id = (new.metadata->>'creator_id')::uuid;
    perform public._send_push(new.user_id, 'Assinatura renova em breve',
      'Sua assinatura de ' || coalesce(v_creator_name, 'um criador') || ' (🪙' || (new.metadata->>'price_coins') || ') renova em ~24h. Garanta seu saldo.');
    return new;
  end if;

  if new.type = 'post_like' then
    perform public._send_push(new.user_id, 'Nova curtida', v_actor_name || ' curtiu seu post');
    return new;
  end if;

  if new.type = 'post_comment' then
    perform public._send_push(new.user_id, 'Novo comentário',
      v_actor_name || ': ' || coalesce(new.metadata->>'text', ''));
    return new;
  end if;

  if new.type = 'gift_received' then
    v_gift_label := case new.metadata->>'gift_code'
      when 'rosa' then 'uma Rosa 🌹'
      when 'chocolate' then 'um Chocolate 🍫'
      when 'diamante' then 'um Diamante 💎'
      when 'coroa_vip' then 'uma Coroa VIP 👑'
      when 'super_carro' then 'um Super Carro 🚗'
      when 'castelo' then 'um Castelo 🏰'
      else 'uma Rosa 🌹'
    end;
    perform public._send_push(new.user_id, 'Presente recebido!', v_actor_name || ' te enviou ' || v_gift_label);
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
