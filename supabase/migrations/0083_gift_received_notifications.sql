-- Curtida e comentário já notificam (0074); presente/rosa recebido ainda só
-- aparecia no chat da live no instante exato do envio — se o criador não
-- tava olhando o chat naquele segundo, nunca ficava sabendo. Gatilho único
-- em wallet_transactions cobre presente cheio E rosa rápida de uma vez, já
-- que os dois passam por _credit_coins_to com o mesmo formato de metadata.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_follower', 'went_live', 'live_invite', 'withdrawal_reviewed', 'subscription_expired', 'cohost_invite', 'missed_call', 'post_like', 'post_comment', 'gift_received'));

create function public._notify_gift_received()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid;
begin
  if new.type not in ('gift_received', 'quick_rose_received') then
    return new;
  end if;

  v_actor_id := nullif(new.metadata->>'from', '')::uuid;
  insert into public.notifications (user_id, type, actor_id, metadata)
    values (new.user_id, 'gift_received', v_actor_id,
      jsonb_build_object('amount', new.amount, 'gift_code', new.metadata->>'gift_code'));
  return new;
end;
$$;

create trigger trg_notify_gift_received
  after insert on public.wallet_transactions
  for each row execute function public._notify_gift_received();

alter table public.profiles alter column push_preferences set default
  '{"new_follower": true, "went_live": true, "live_invite": true, "direct_message": true, "withdrawal_reviewed": true, "subscription_expired": true, "post_like": true, "post_comment": true, "gift_received": true}'::jsonb;

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
