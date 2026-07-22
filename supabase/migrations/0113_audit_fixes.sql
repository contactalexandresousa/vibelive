-- Achados numa auditoria de regressão entre rodadas (checando se features de
-- rodadas diferentes que mexem na mesma tabela ficaram consistentes entre si).

-- 1) "Remover da live" (live_room_bans, 0104) só barrava o vídeo — o chat
-- continuava aberto pra quem foi banido, porque _enforce_live_chat_mute só
-- checava live_chat_mutes. A ação mais forte ("remover") dava proteção mais
-- fraca no chat do que a mais fraca ("silenciar"). Corpo igual ao já
-- publicado (conferido via pg_get_functiondef), só acrescenta o check de ban.
create or replace function public._enforce_live_chat_mute()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_broadcaster_id uuid;
begin
  select id into v_broadcaster_id from public.profiles where username = new.broadcaster_handle;
  if v_broadcaster_id is not null then
    if exists (
      select 1 from public.live_room_bans
      where broadcaster_id = v_broadcaster_id and banned_user_id = new.user_id
    ) then
      raise exception 'Você foi removido dessa live pelo anfitrião.';
    end if;
    if exists (
      select 1 from public.live_chat_mutes
      where broadcaster_id = v_broadcaster_id and muted_user_id = new.user_id
    ) then
      raise exception 'Você foi silenciado nesse chat pelo anfitrião.';
    end if;
  end if;
  return new;
end;
$$;

-- 2) dm_privacy = 'followers_only' (0110) só checava "o destinatário segue
-- quem mandou" — sem exceção pra conversa já em andamento. Se Alice
-- restringe pra "só quem eu sigo" e manda DM pro Bob (que ela não segue,
-- permitido porque o Bob está com 'everyone'), o Bob nunca consegue
-- responder: a mesma checagem roda pro lado dele e barra, porque Alice não
-- segue Bob. Corrigido com uma exceção: se quem tem a restrição ativa (o
-- destinatário da mensagem nova) já mandou mensagem antes pro remetente,
-- foi ELE quem abriu contato — a conversa já existe e continua aberta.
create or replace function public._enforce_dm_privacy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_privacy text;
begin
  select dm_privacy into v_privacy from public.profiles where id = new.recipient_id;
  if coalesce(v_privacy, 'everyone') = 'followers_only' and new.sender_id <> new.recipient_id then
    if not exists (
      select 1 from public.follows f
      join public.profiles p on p.username = f.followed_handle
      where f.follower_id = new.recipient_id and p.id = new.sender_id
    ) and not exists (
      select 1 from public.direct_messages dm
      where dm.sender_id = new.recipient_id and dm.recipient_id = new.sender_id
    ) then
      raise exception 'Essa pessoa só recebe mensagens de quem ela segue.';
    end if;
  end if;
  return new;
end;
$$;
