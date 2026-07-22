-- Uma chamada cancelada/não atendida não deixava rastro nenhum pra quem
-- recebeu — sem push, sem notificação, sem toast (a pessoa só saberia se
-- estivesse olhando bem na hora). Reaproveita a mesma infra de notificações +
-- push já usada pra tudo mais (0039).
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_follower', 'went_live', 'live_invite', 'withdrawal_reviewed', 'subscription_expired', 'cohost_invite', 'missed_call'));

create function public._notify_on_missed_call()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'missed' and old.status = 'ringing' then
    insert into public.notifications (user_id, type, actor_id)
      values (new.callee_id, 'missed_call', new.caller_id);
  end if;
  return new;
end;
$$;

create trigger trg_notify_on_missed_call
  after update on public.call_invites
  for each row execute function public._notify_on_missed_call();

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
  v_email_subject text;
  v_email_html text;
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

    v_email_subject := 'VibeLive — ' || v_title;
    v_email_html := '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">'
      || '<h2 style="color:#ff4d6d;margin:0 0 16px;">VibeLive</h2>'
      || '<p style="font-size:15px;color:#1c1c22;">' || v_body || '</p>'
      || '<p style="font-size:12px;color:#8b8b93;margin-top:24px;">Este é um recibo automático, não é preciso responder.</p>'
      || '</div>';
    perform public._send_receipt_email(new.user_id, v_email_subject, v_email_html);
    return new;
  end if;

  if new.type = 'subscription_expired' then
    select coalesce(display_name, username) into v_creator_name
      from public.profiles where id = (new.metadata->>'creator_id')::uuid;
    perform public._send_push(new.user_id, 'Assinatura expirou',
      'Sua assinatura de ' || coalesce(v_creator_name, 'um criador') || ' expirou por falta de saldo.');
    return new;
  end if;

  if new.type = 'cohost_invite' then
    perform public._send_push(new.user_id, 'Convite pra co-transmitir', v_actor_name || ' te chamou pra co-transmitir uma live!');
    return new;
  end if;

  if new.type = 'missed_call' then
    perform public._send_push(new.user_id, 'Chamada perdida', v_actor_name || ' te ligou e você não atendeu.');
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
