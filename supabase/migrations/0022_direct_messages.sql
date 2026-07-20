-- Mensagens diretas (DM) reais entre usuários — persistidas e sincronizadas
-- via Realtime, mesmo padrão já usado no chat da sala de live (0012). Antes,
-- "conversas" eram só objetos locais em memória: cada pessoa via só as
-- próprias mensagens, ninguém mais.
create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index direct_messages_sender_idx on public.direct_messages (sender_id, created_at);
create index direct_messages_recipient_idx on public.direct_messages (recipient_id, created_at);

alter table public.direct_messages enable row level security;

-- Só quem participa da conversa (remetente ou destinatário) pode ler.
create policy "participants can read their messages"
  on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Só pode enviar mensagem em próprio nome.
create policy "users send messages as themselves"
  on public.direct_messages for insert
  with check (auth.uid() = sender_id);

-- Só o destinatário pode marcar como lida (não é dado sensível/carteira, então
-- RLS por dono da linha basta — não precisa de RPC SECURITY DEFINER aqui).
create policy "recipients mark messages read"
  on public.direct_messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

alter publication supabase_realtime add table public.direct_messages;
