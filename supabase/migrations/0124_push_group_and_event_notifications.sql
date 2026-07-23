-- Duas lacunas reais de notificação: DM 1:1 já manda push (0039), mas DM em
-- grupo (0114) nunca ganhou o mesmo tratamento; e evento marcado (0120) tem
-- RSVP mas nenhum aviso quando o anfitrião de fato entra ao vivo — quem
-- marcou interesse só descobre se calhar de abrir o app na hora certa.
-- Reaproveita _send_push (0039) e o esquema de preferências já existente,
-- sem criar uma chave nova pra cada evento (mesmo padrão de reuso já usado
-- em missões diárias e drops reaproveitando o type 'daily_checkin' do
-- ledger): mensagem de grupo reaproveita 'direct_message', evento ao vivo
-- reaproveita 'went_live' — os dois já expressam a intenção certa
-- ("alguém te mandou mensagem" / "alguém que você acompanha foi ao vivo").

create or replace function public._push_on_group_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_name text;
  v_conversation_name text;
  v_recipient record;
  v_prefs jsonb;
begin
  select coalesce(display_name, username) into v_sender_name from public.profiles where id = new.sender_id;
  select name into v_conversation_name from public.group_conversations where id = new.conversation_id;

  for v_recipient in
    select user_id from public.group_conversation_members
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    select push_preferences into v_prefs from public.profiles where id = v_recipient.user_id;
    if coalesce((v_prefs->>'direct_message')::boolean, true) then
      perform public._send_push(
        v_recipient.user_id,
        coalesce(v_sender_name, 'Alguém') || ' em ' || coalesce(v_conversation_name, 'grupo'),
        new.text
      );
    end if;
  end loop;

  return new;
end;
$$;

create trigger trg_push_on_group_message
  after insert on public.group_messages
  for each row execute function public._push_on_group_message();

-- Mesma janela de tolerância de mark_event_attendance (0120): 15min antes a
-- 90min depois do horário marcado — se o anfitrião foi ao vivo fora dessa
-- janela, não é o mesmo "estou começando o evento agora", não avisa ninguém.
create or replace function public._push_on_event_live()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event record;
  v_host_name text;
  v_interested record;
  v_prefs jsonb;
begin
  select * into v_event from public.live_events
  where host_id = new.user_id
    and scheduled_at between now() - interval '15 minutes' and now() + interval '90 minutes'
  order by scheduled_at asc
  limit 1;

  if v_event.id is null then
    return new;
  end if;

  select coalesce(display_name, username) into v_host_name from public.profiles where id = new.user_id;

  for v_interested in
    select user_id from public.live_event_interests where event_id = v_event.id
  loop
    select push_preferences into v_prefs from public.profiles where id = v_interested.user_id;
    if coalesce((v_prefs->>'went_live')::boolean, true) then
      perform public._send_push(
        v_interested.user_id,
        'Evento ao vivo agora',
        coalesce(v_host_name, 'Alguém') || ' começou "' || v_event.title || '"'
      );
    end if;
  end loop;

  return new;
end;
$$;

create trigger trg_push_on_event_live
  after insert on public.live_sessions
  for each row execute function public._push_on_event_live();
