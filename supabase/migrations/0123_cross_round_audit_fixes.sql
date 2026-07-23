-- Auditoria de consistência entre as 7 rodadas do reposicionamento
-- (0114-0122), feita depois de todas terem sido enviadas — mesmo padrão da
-- auditoria de 0113. Dois achados de verdade corrigidos aqui (o terceiro,
-- sala de voz não se encerrando de verdade ao sair pelo botão de voltar, foi
-- corrigido só no cliente, sem precisar de migration):

-- 1) A missão diária "converse com 3 pessoas" (0117) só contava DM 1:1
-- (direct_messages) — nunca contava quem já usa o chat em grupo (0114), que
-- foi ao ar DEPOIS de 0117 já existir na sessão mas ANTES de missões serem
-- desenhadas, e a lacuna nunca foi fechada. Passa a unir os destinatários de
-- DM com os outros membros de qualquer grupo onde a pessoa mandou mensagem
-- hoje, contando "pessoas alcançadas" sem repetir quem já apareceu nos dois.
create or replace function public.get_daily_missions_progress()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_watched int;
  v_posted int;
  v_chatted int;
  v_liked int;
  v_claimed boolean;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select count(distinct target_id) into v_watched
    from public.daily_mission_events
    where user_id = v_uid and mission_type = 'watch_live' and event_date = current_date;

  select count(*) into v_posted
    from public.posts
    where user_id = v_uid and created_at::date = current_date;

  select count(distinct person_id) into v_chatted
  from (
    select recipient_id as person_id
    from public.direct_messages
    where sender_id = v_uid and created_at::date = current_date
    union
    select gcm.user_id as person_id
    from public.group_messages gm
    join public.group_conversation_members gcm
      on gcm.conversation_id = gm.conversation_id and gcm.user_id <> v_uid
    where gm.sender_id = v_uid and gm.created_at::date = current_date
  ) combined;

  select count(*) into v_liked
    from public.post_likes pl
    join public.posts p on p.id = pl.post_id
    where p.user_id = v_uid and pl.created_at::date = current_date;

  select exists(
    select 1 from public.daily_mission_claims where user_id = v_uid and claim_date = current_date
  ) into v_claimed;

  return jsonb_build_object(
    'watch_live', jsonb_build_object('progress', least(v_watched, 2), 'target', 2),
    'post', jsonb_build_object('progress', least(v_posted, 1), 'target', 1),
    'chat', jsonb_build_object('progress', least(v_chatted, 3), 'target', 3),
    'likes_received', jsonb_build_object('progress', least(v_liked, 20), 'target', 20),
    'all_complete', v_watched >= 2 and v_posted >= 1 and v_chatted >= 3 and v_liked >= 20,
    'bonus_claimed', v_claimed
  );
end;
$$;

-- 2) voice_rooms.community_slug (0121) nunca era lido de volta em lugar
-- nenhum — a tela de comunidade (0119) só tinha abas de live/posts/ranking,
-- sem jeito de ver as salas de voz marcadas pra ela. Lista as salas de voz
-- ativas de uma comunidade, mesmo formato de get_active_voice_rooms.
create or replace function public.get_community_voice_rooms(p_slug text)
returns table (
  id uuid,
  host_id uuid,
  room_name text,
  title text,
  host_username text,
  host_display_name text,
  host_avatar_url text,
  participant_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id, r.host_id, r.room_name, r.title,
    p.username, p.display_name, p.avatar_url,
    (select count(*) from public.voice_room_participants vp where vp.room_id = r.id)
  from public.voice_rooms r
  join public.profiles p on p.id = r.host_id
  where r.community_slug = p_slug and r.ended_at is null
  order by r.started_at desc;
$$;
