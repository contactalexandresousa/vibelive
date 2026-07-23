-- DMs em grupo. Até aqui, direct_messages (0022) só suporta conversa 1:1
-- (sender_id/recipient_id). Em vez de reescrever essa tabela já bem
-- estabelecida (edição, exclusão, mute, privacidade — 0097/0105/0110/0111),
-- grupo vive num modelo paralelo: uma conversa tem N membros, mensagens
-- referenciam a conversa, não um par de usuários.
--
-- Escopo desta rodada: criar grupo com membros iniciais, enviar/receber
-- mensagem em tempo real, sair do grupo, ver lista de membros. Adicionar
-- membro depois da criação fica fora de escopo por ora (fica pra uma
-- rodada futura se fizer falta).
create table public.group_conversations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  avatar_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_conversation_members (
  conversation_id uuid not null references public.group_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_admin boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index group_conversation_members_user_idx on public.group_conversation_members (user_id);

create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.group_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index group_messages_conversation_idx on public.group_messages (conversation_id, created_at);

alter table public.group_conversations enable row level security;
alter table public.group_conversation_members enable row level security;
alter table public.group_messages enable row level security;

-- Só quem é membro enxerga a conversa. Criação/inserção de membro só via RPC
-- (create_group_conversation) — não existe policy de insert direto pra
-- garantir os invariantes (bloqueio mútuo, limite de membros) atomicamente.
create policy "members can read their group conversations"
  on public.group_conversations for select
  using (exists (
    select 1 from public.group_conversation_members m
    where m.conversation_id = id and m.user_id = auth.uid()
  ));

-- Roster: qualquer membro vê todos os outros membros da mesma conversa.
create policy "members can read the roster of their groups"
  on public.group_conversation_members for select
  using (exists (
    select 1 from public.group_conversation_members m2
    where m2.conversation_id = group_conversation_members.conversation_id
      and m2.user_id = auth.uid()
  ));

-- Sair do grupo é só apagar a própria linha de membro — não é dado sensível,
-- RLS por dono da linha basta (mesmo padrão de "recipients mark messages read" em 0022).
create policy "members can leave a group"
  on public.group_conversation_members for delete
  using (auth.uid() = user_id);

create policy "members can read messages in their groups"
  on public.group_messages for select
  using (exists (
    select 1 from public.group_conversation_members m
    where m.conversation_id = group_messages.conversation_id and m.user_id = auth.uid()
  ));

create policy "members can send messages in their groups"
  on public.group_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.group_conversation_members m
      where m.conversation_id = group_messages.conversation_id and m.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.group_messages;

-- Cria o grupo + membro admin (o criador) + membros iniciais, tudo atômico.
-- Recebe só uma lista de ids (nunca quantia/valor — não é rota de carteira,
-- mas o padrão de "RPC de propósito específico" se mantém por consistência).
create or replace function public.create_group_conversation(p_name text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_conversation_id uuid;
  v_member_id uuid;
  v_member_count int;
begin
  if v_uid is null then
    raise exception 'Não autenticado.';
  end if;

  if p_name is null or char_length(trim(p_name)) < 1 then
    raise exception 'Nome do grupo é obrigatório.';
  end if;

  -- de-duplica e remove o próprio criador da lista (ele entra sempre como admin)
  select array_agg(distinct x) into p_member_ids
  from unnest(p_member_ids) as x
  where x <> v_uid;

  v_member_count := coalesce(array_length(p_member_ids, 1), 0);
  if v_member_count < 1 then
    raise exception 'Escolha pelo menos 1 pessoa para o grupo.';
  end if;
  if v_member_count > 49 then
    raise exception 'Grupo pode ter no máximo 50 participantes.';
  end if;

  if exists (
    select 1 from public.blocked_users b
    where (b.blocker_id = v_uid and b.blocked_id = any(p_member_ids))
       or (b.blocked_id = v_uid and b.blocker_id = any(p_member_ids))
  ) then
    raise exception 'Não é possível criar grupo com alguém bloqueado.';
  end if;

  insert into public.group_conversations (name, created_by)
  values (trim(p_name), v_uid)
  returning id into v_conversation_id;

  insert into public.group_conversation_members (conversation_id, user_id, is_admin)
  values (v_conversation_id, v_uid, true);

  foreach v_member_id in array p_member_ids loop
    insert into public.group_conversation_members (conversation_id, user_id, is_admin)
    values (v_conversation_id, v_member_id, false);
  end loop;

  return v_conversation_id;
end;
$$;

-- Lista as conversas em grupo do usuário logado com preview da última mensagem.
create or replace function public.get_my_group_conversations()
returns table (
  conversation_id uuid,
  name text,
  avatar_url text,
  member_count bigint,
  last_message text,
  last_message_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    gc.id,
    gc.name,
    gc.avatar_url,
    (select count(*) from public.group_conversation_members m2 where m2.conversation_id = gc.id),
    lm.text,
    coalesce(lm.created_at, gc.created_at)
  from public.group_conversations gc
  join public.group_conversation_members m on m.conversation_id = gc.id and m.user_id = auth.uid()
  left join lateral (
    select gm.text, gm.created_at from public.group_messages gm
    where gm.conversation_id = gc.id
    order by gm.created_at desc
    limit 1
  ) lm on true
  order by coalesce(lm.created_at, gc.created_at) desc;
$$;
