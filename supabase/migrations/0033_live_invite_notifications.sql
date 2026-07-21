-- Convite pra live restrita não avisava ninguém — ficava só na tabela, sem
-- nenhum jeito real da pessoa convidada saber que foi convidada. Mesmo
-- padrão dos outros dois tipos de notificação (new_follower/went_live).
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_follower', 'went_live', 'live_invite'));

create function public._notify_live_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_host_id uuid;
begin
  select user_id into v_host_id from public.live_sessions where id = new.live_session_id;
  if v_host_id is not null then
    insert into public.notifications (user_id, type, actor_id)
    values (new.invited_user_id, 'live_invite', v_host_id);
  end if;
  return new;
end;
$$;

create trigger trg_notify_live_invite
  after insert on public.live_session_invites
  for each row execute function public._notify_live_invite();
