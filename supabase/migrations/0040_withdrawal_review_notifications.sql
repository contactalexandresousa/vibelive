-- Quem pede saque só ficava sabendo do resultado se reabrisse a carteira e
-- olhasse manualmente. Agora vira uma notificação real (in-app + push).
-- notifications não tinha como carregar contexto extra (quantas moedas, qual
-- status) — metadata jsonb resolve isso de forma genérica, reaproveitável
-- por qualquer notificação futura que precise de mais que "quem causou".
alter table public.notifications add column metadata jsonb not null default '{}'::jsonb;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_follower', 'went_live', 'live_invite', 'withdrawal_reviewed'));

create or replace function public.review_withdrawal_request(p_request_id uuid, p_new_status text, p_admin_notes text default null)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_request public.withdrawal_requests;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem revisar saques.';
  end if;
  if p_new_status not in ('approved', 'rejected', 'paid') then
    raise exception 'Status inválido.';
  end if;

  select * into v_request from public.withdrawal_requests where id = p_request_id for update;
  if v_request is null then
    raise exception 'Solicitação não encontrada.';
  end if;
  if v_request.status <> 'pending' and p_new_status = 'rejected' then
    raise exception 'Só é possível rejeitar solicitações pendentes.';
  end if;

  if p_new_status = 'rejected' then
    update public.profiles set coins = coins + v_request.coins_amount where id = v_request.user_id;
    insert into public.wallet_transactions (user_id, amount, type, metadata)
      values (v_request.user_id, v_request.coins_amount, 'withdrawal_refund', jsonb_build_object('request_id', v_request.id));
  end if;

  update public.withdrawal_requests
  set status = p_new_status,
      admin_notes = coalesce(p_admin_notes, admin_notes),
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_request_id
  returning * into v_request;

  insert into public.notifications (user_id, type, metadata)
    values (v_request.user_id, 'withdrawal_reviewed', jsonb_build_object(
      'status', p_new_status, 'coins_amount', v_request.coins_amount, 'request_id', v_request.id
    ));

  return v_request;
end;
$$;

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
