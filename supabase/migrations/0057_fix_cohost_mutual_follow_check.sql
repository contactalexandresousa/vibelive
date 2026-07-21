-- BUG: invite_cohost() é SECURITY DEFINER, então roda como dono da tabela
-- (postgres) — e dono de tabela ignora RLS por padrão (FORCE ROW LEVEL
-- SECURITY não está ativo em nenhuma tabela deste projeto). A policy "host
-- invites mutual followers as cohost" (0056) nunca chega a rodar de verdade
-- nesse caminho, então QUALQUER transmissor podia convidar QUALQUER pessoa,
-- não só seguidores mútuos. Mesma lição já aplicada no resto do projeto:
-- função SECURITY DEFINER precisa checar autorização no PRÓPRIO corpo, não
-- confiar em RLS pra reforçar uma regra que ela mesma vai contornar.
create or replace function public.invite_cohost(p_live_session_id uuid, p_invited_user_id uuid)
returns public.live_cohost_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_host_id uuid;
  v_host_username text;
  v_invited_username text;
  v_invite public.live_cohost_invites;
begin
  select user_id into v_host_id from public.live_sessions where id = p_live_session_id and ended_at is null;
  if v_host_id is null or v_host_id <> v_uid then
    raise exception 'Só quem está transmitindo pode convidar um co-transmissor.';
  end if;
  if p_invited_user_id = v_uid then
    raise exception 'Não é possível se convidar.';
  end if;

  select username into v_host_username from public.profiles where id = v_uid;
  select username into v_invited_username from public.profiles where id = p_invited_user_id;

  if not exists (select 1 from public.follows where follower_id = v_uid and followed_handle = v_invited_username)
     or not exists (select 1 from public.follows where follower_id = p_invited_user_id and followed_handle = v_host_username)
  then
    raise exception 'Só é possível convidar quem te segue e você segue de volta.';
  end if;

  insert into public.live_cohost_invites (live_session_id, invited_user_id)
    values (p_live_session_id, p_invited_user_id)
    on conflict (live_session_id, invited_user_id) do update set status = 'pending', responded_at = null
    returning * into v_invite;

  insert into public.notifications (user_id, type, actor_id, metadata)
    values (p_invited_user_id, 'cohost_invite', v_uid, jsonb_build_object('invite_id', v_invite.id, 'live_session_id', p_live_session_id));

  return v_invite;
end;
$$;
