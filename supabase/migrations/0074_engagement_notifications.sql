-- Curtida e comentário em post não geravam nenhuma notificação (nem in-app,
-- nem push) até agora — só novo seguidor, foi ao vivo, convite de live etc.
-- Reaproveita a mesma tabela/gatilho de push já existentes (0024/0039/0050):
-- basta inserir em notifications com um tipo novo que o _push_on_notification
-- já existente cuida do resto, respeitando a preferência por tipo.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_follower', 'went_live', 'live_invite', 'withdrawal_reviewed', 'subscription_expired', 'cohost_invite', 'missed_call', 'post_like', 'post_comment'));

alter table public.profiles alter column push_preferences set default
  '{"new_follower": true, "went_live": true, "live_invite": true, "direct_message": true, "withdrawal_reviewed": true, "subscription_expired": true, "post_like": true, "post_comment": true}'::jsonb;

create function public._notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_owner uuid;
begin
  select user_id into v_post_owner from public.posts where id = new.post_id;
  if v_post_owner is not null and v_post_owner <> new.user_id then
    insert into public.notifications (user_id, type, actor_id, metadata)
    values (v_post_owner, 'post_like', new.user_id, jsonb_build_object('post_id', new.post_id));
  end if;
  return new;
end;
$$;

create trigger trg_notify_post_like
  after insert on public.post_likes
  for each row execute function public._notify_post_like();

create function public._notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_owner uuid;
begin
  select user_id into v_post_owner from public.posts where id = new.post_id;
  if v_post_owner is not null and v_post_owner <> new.user_id then
    insert into public.notifications (user_id, type, actor_id, metadata)
    values (v_post_owner, 'post_comment', new.user_id, jsonb_build_object('post_id', new.post_id, 'text', left(new.text, 140)));
  end if;
  return new;
end;
$$;

create trigger trg_notify_post_comment
  after insert on public.post_comments
  for each row execute function public._notify_post_comment();

-- Reescreve pra incluir os dois tipos novos — mesma lógica de preferências
-- por tipo da 0050, só adiciona os cases.
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

  if new.type = 'post_like' then
    perform public._send_push(new.user_id, 'Nova curtida', v_actor_name || ' curtiu seu post');
    return new;
  end if;

  if new.type = 'post_comment' then
    perform public._send_push(new.user_id, 'Novo comentário',
      v_actor_name || ': ' || coalesce(new.metadata->>'text', ''));
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
