-- Bloquear é a única forma de parar notificação de alguém hoje — não dá pra
-- só silenciar uma conversa específica sem cortar contato de vez (a pessoa
-- continua podendo mandar, você só para de ser avisado). Mesmo padrão de
-- story_mutes (0095): dono da relação gerencia a própria lista, sem RPC.
create table public.dm_mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_user_id)
);

alter table public.dm_mutes enable row level security;

create policy "users manage their own dm mutes"
  on public.dm_mutes for all
  using (auth.uid() = muter_id)
  with check (auth.uid() = muter_id);

-- Corpo igual ao já publicado (conferido via pg_get_functiondef antes de
-- mexer), só acrescenta o check de silenciado antes de mandar o push.
create or replace function public._push_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_name text;
  v_prefs jsonb;
begin
  if exists (select 1 from public.dm_mutes where muter_id = new.recipient_id and muted_user_id = new.sender_id) then
    return new;
  end if;

  select push_preferences into v_prefs from public.profiles where id = new.recipient_id;
  if coalesce((v_prefs->>'direct_message')::boolean, true) = false then
    return new;
  end if;

  select coalesce(display_name, username) into v_sender_name from public.profiles where id = new.sender_id;
  perform public._send_push(new.recipient_id, coalesce(v_sender_name, 'Nova mensagem'), new.text);
  return new;
end;
$$;
