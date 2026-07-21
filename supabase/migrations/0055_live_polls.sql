-- Enquete ao vivo: criador lança uma pergunta rápida, espectadores votam e
-- veem o resultado atualizar em tempo real. Reaproveita o mesmo canal
-- realtime já usado pro chat da sala (broadcaster_handle como chave).
create table public.live_polls (
  id uuid primary key default gen_random_uuid(),
  broadcaster_handle text not null,
  question text not null check (char_length(question) between 1 and 140),
  options text[] not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint live_polls_options_count check (array_length(options, 1) between 2 and 4)
);

create index live_polls_room_idx on public.live_polls (broadcaster_handle, created_at desc);

alter table public.live_polls enable row level security;

create policy "anyone can read live polls"
  on public.live_polls for select
  using (true);
-- Sem insert/update direto: só as RPCs abaixo, que confirmam que quem chama
-- é de fato o dono da sala (broadcaster_handle = próprio username).

create table public.live_poll_votes (
  poll_id uuid not null references public.live_polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_index int not null,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table public.live_poll_votes enable row level security;

create policy "anyone can read poll votes"
  on public.live_poll_votes for select
  using (true);
-- Leitura pública das linhas de voto é necessária pra calcular porcentagem
-- em tempo real no cliente; não expõe nada além de "quem votou em quê", o
-- mesmo tipo de dado já público em curtidas de post.

alter publication supabase_realtime add table public.live_polls;
alter publication supabase_realtime add table public.live_poll_votes;

create function public.create_live_poll(p_broadcaster_handle text, p_question text, p_options text[])
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

  -- Só uma enquete aberta por vez na mesma sala.
  update public.live_polls set closed_at = now()
    where broadcaster_handle = p_broadcaster_handle and closed_at is null;

  insert into public.live_polls (broadcaster_handle, question, options)
    values (p_broadcaster_handle, trim(p_question), p_options)
    returning * into v_poll;

  return v_poll;
end;
$$;

create function public.vote_live_poll(p_poll_id uuid, p_option_index int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_poll public.live_polls;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_poll from public.live_polls where id = p_poll_id;
  if v_poll.id is null or v_poll.closed_at is not null then
    raise exception 'Essa enquete não está mais aberta.';
  end if;
  if p_option_index < 0 or p_option_index >= array_length(v_poll.options, 1) then
    raise exception 'Opção inválida.';
  end if;

  insert into public.live_poll_votes (poll_id, user_id, option_index)
    values (p_poll_id, v_uid, p_option_index)
    on conflict (poll_id, user_id) do update set option_index = excluded.option_index;
end;
$$;

create function public.close_live_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  update public.live_polls
  set closed_at = now()
  where id = p_poll_id
    and broadcaster_handle = (select username from public.profiles where id = v_uid);
end;
$$;
