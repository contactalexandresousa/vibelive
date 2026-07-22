-- Digitar @usuário num post ou comentário hoje é só texto solto — a pessoa
-- marcada nunca fica sabendo. Detecta @usuário (mesmo formato aceito no
-- cadastro: minúsculas, números, ponto ou underline, 3-24 chars — 0092+
-- onboarding) tanto na legenda do post quanto no texto do comentário, e
-- notifica quem foi marcado (menos auto-menção). Roda via trigger AFTER
-- INSERT em vez de dentro de add_post_comment/createPost pra funcionar
-- igual não importa se o insert veio da RPC ou direto do cliente, e pra não
-- mexer na função de comentário (já mexeu demais de overload, 0093).
create function public._notify_mentions(p_text text, p_actor_id uuid, p_post_id uuid, p_comment_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_mentioned_id uuid;
begin
  if p_text is null then
    return;
  end if;

  for v_username in
    select distinct lower(m[1]) from regexp_matches(p_text, '@([a-zA-Z0-9_.]{3,24})', 'g') as m
  loop
    select id into v_mentioned_id from public.profiles where username = v_username;
    if v_mentioned_id is not null and v_mentioned_id <> p_actor_id then
      insert into public.notifications (user_id, actor_id, type, metadata)
        values (v_mentioned_id, p_actor_id, 'mention',
          jsonb_build_object('post_id', p_post_id, 'comment_id', p_comment_id, 'text', left(p_text, 140)));
    end if;
  end loop;
end;
$$;

create function public._notify_post_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._notify_mentions(new.caption, new.user_id, new.id, null);
  return new;
end;
$$;

create trigger trg_notify_post_mentions
  after insert on public.posts
  for each row execute function public._notify_post_mentions();

-- Roda depois do trigger de censura de palavrão (0094, BEFORE INSERT) — new.text
-- já vem com o texto final, censura já aplicada.
create function public._notify_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._notify_mentions(new.text, new.user_id, new.post_id, new.id);
  return new;
end;
$$;

create trigger trg_notify_comment_mentions
  after insert on public.post_comments
  for each row execute function public._notify_comment_mentions();

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_follower', 'went_live', 'live_invite', 'withdrawal_reviewed', 'subscription_expired', 'cohost_invite', 'missed_call', 'post_like', 'post_comment', 'gift_received', 'subscription_renewing_soon', 'mention'));

alter table public.profiles alter column push_preferences set default
  '{"new_follower": true, "went_live": true, "live_invite": true, "direct_message": true, "withdrawal_reviewed": true, "subscription_expired": true, "post_like": true, "post_comment": true, "gift_received": true, "subscription_renewing_soon": true, "mention": true}'::jsonb;

-- Corpo exatamente igual ao já publicado (conferido via pg_get_functiondef
-- direto no banco antes de mexer, pra não arriscar reescrever de memória e
-- quebrar algum tipo existente) — só acrescenta o bloco de 'mention'.
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

  if new.type = 'mention' then
    perform public._send_push(new.user_id, 'Você foi mencionado',
      v_actor_name || ' mencionou você: ' || coalesce(new.metadata->>'text', ''));
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
