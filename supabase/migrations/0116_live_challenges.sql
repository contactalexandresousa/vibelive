-- Live com desafio: em vez de só assistir, quem transmite chama convidados
-- (co-transmissão já existente, 0056) pra uma "batalha" (dança, desenho,
-- karaokê, culinária, improviso, melhor momento) e a audiência vota em tempo
-- real em quem manda melhor — reaproveita a votação já existente (0055),
-- só marcando quando uma enquete É a votação decisiva do desafio.
alter table public.live_sessions add column is_challenge boolean not null default false;
alter table public.live_sessions add column challenge_type text
  check (challenge_type is null or challenge_type in ('danca', 'desenho', 'karaoke', 'culinaria', 'improviso', 'melhor_momento'));

alter table public.profiles add column challenge_wins int not null default 0;

alter table public.live_polls add column is_challenge boolean not null default false;

-- p_is_challenge tem default, então nenhuma chamada existente quebra.
create or replace function public.create_live_poll(p_broadcaster_handle text, p_question text, p_options text[], p_is_challenge boolean default false)
returns public.live_polls
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_username text;
  v_poll public.live_polls;
begin
  select username into v_username from public.profiles where id = v_uid;
  if v_username is null or v_username <> p_broadcaster_handle then
    raise exception 'Só quem está transmitindo pode criar uma enquete nessa live.';
  end if;
  if trim(coalesce(p_question, '')) = '' then
    raise exception 'Escreva uma pergunta pra enquete.';
  end if;
  if array_length(p_options, 1) is null or array_length(p_options, 1) < 2 or array_length(p_options, 1) > 4 then
    raise exception 'A enquete precisa ter entre 2 e 4 opções.';
  end if;

  update public.live_polls set closed_at = now()
    where broadcaster_handle = p_broadcaster_handle and closed_at is null;

  insert into public.live_polls (broadcaster_handle, question, options, is_challenge)
    values (p_broadcaster_handle, trim(p_question), p_options, p_is_challenge)
    returning * into v_poll;

  return v_poll;
end;
$$;

-- Muda de "void" pra "jsonb" (precisa dropar antes — Postgres não deixa
-- CREATE OR REPLACE trocar o tipo de retorno) pra devolver o vencedor do
-- desafio pro cliente anunciar. Sem chamador hoje (a UI de fechar enquete
-- ainda não existia), então seguro trocar a assinatura.
drop function if exists public.close_live_poll(uuid);

create function public.close_live_poll(p_poll_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_poll public.live_polls;
  v_winner_votes int;
  v_tie_count int;
  v_winner_option int;
  v_winner_username text;
  v_winner_id uuid;
  v_winner_display_name text;
  v_xp_awarded int := 0;
begin
  select * into v_poll from public.live_polls where id = p_poll_id;
  if v_poll.id is null then
    raise exception 'Enquete não encontrada.';
  end if;
  if v_poll.broadcaster_handle <> (select username from public.profiles where id = v_uid) then
    raise exception 'Só quem está transmitindo pode encerrar essa votação.';
  end if;

  update public.live_polls set closed_at = now() where id = p_poll_id and closed_at is null;

  if not v_poll.is_challenge then
    return jsonb_build_object('is_challenge', false);
  end if;

  select cnt into v_winner_votes
  from (
    select count(*) as cnt from public.live_poll_votes where poll_id = p_poll_id
    group by option_index order by count(*) desc limit 1
  ) t;

  if v_winner_votes is null or v_winner_votes = 0 then
    return jsonb_build_object('is_challenge', true, 'winner_username', null);
  end if;

  select count(*) into v_tie_count
  from (
    select option_index, count(*) as cnt from public.live_poll_votes where poll_id = p_poll_id group by option_index
  ) t
  where cnt = v_winner_votes;

  if v_tie_count > 1 then
    return jsonb_build_object('is_challenge', true, 'winner_username', null, 'tie', true);
  end if;

  select option_index into v_winner_option
  from (
    select option_index, count(*) as cnt from public.live_poll_votes where poll_id = p_poll_id group by option_index
  ) t
  where cnt = v_winner_votes
  limit 1;

  v_winner_username := ltrim(v_poll.options[v_winner_option + 1], '@');
  select id, coalesce(display_name, username) into v_winner_id, v_winner_display_name
  from public.profiles where username = v_winner_username;

  if v_winner_id is not null then
    perform public._apply_xp(v_winner_id, 80);
    update public.profiles set challenge_wins = challenge_wins + 1 where id = v_winner_id;
    v_xp_awarded := 80;
  end if;

  return jsonb_build_object(
    'is_challenge', true,
    'winner_username', v_winner_username,
    'winner_display_name', v_winner_display_name,
    'xp_awarded', v_xp_awarded
  );
end;
$$;
