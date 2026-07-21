-- Até aqui, notificação push era tudo ou nada (um botão só liga/desliga
-- geral). Cada tipo agora tem uma chave própria em profiles.push_preferences
-- — RLS de profiles já deixa o dono editar campos não-econômicos, então não
-- precisa de RPC nova só pra salvar a preferência.
alter table public.profiles add column push_preferences jsonb not null default
  '{"new_follower": true, "went_live": true, "live_invite": true, "direct_message": true, "withdrawal_reviewed": true, "subscription_expired": true}'::jsonb;

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

create or replace function public._push_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_name text;
  v_prefs jsonb;
begin
  select push_preferences into v_prefs from public.profiles where id = new.recipient_id;
  if coalesce((v_prefs->>'direct_message')::boolean, true) = false then
    return new;
  end if;

  select coalesce(display_name, username) into v_sender_name from public.profiles where id = new.sender_id;
  perform public._send_push(new.recipient_id, coalesce(v_sender_name, 'Nova mensagem'), new.text);
  return new;
end;
$$;
