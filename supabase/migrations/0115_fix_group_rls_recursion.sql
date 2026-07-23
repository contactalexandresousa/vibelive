-- A policy de select em group_conversation_members (0114) consultava a
-- PRÓPRIA tabela dentro do USING — Postgres reaplica a mesma policy pra
-- filtrar essa subquery, que reaplica de novo, infinito (erro 42P17). Fix
-- padrão: função SECURITY DEFINER (ignora RLS) checando a associação, usada
-- no lugar da subquery direta em toda policy que precisa dessa checagem.
create or replace function public._is_member_of_group_conversation(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_conversation_members m
    where m.conversation_id = p_conversation_id and m.user_id = p_user_id
  );
$$;

drop policy "members can read their group conversations" on public.group_conversations;
create policy "members can read their group conversations"
  on public.group_conversations for select
  using (public._is_member_of_group_conversation(id, auth.uid()));

drop policy "members can read the roster of their groups" on public.group_conversation_members;
create policy "members can read the roster of their groups"
  on public.group_conversation_members for select
  using (public._is_member_of_group_conversation(conversation_id, auth.uid()));

drop policy "members can read messages in their groups" on public.group_messages;
create policy "members can read messages in their groups"
  on public.group_messages for select
  using (public._is_member_of_group_conversation(conversation_id, auth.uid()));

drop policy "members can send messages in their groups" on public.group_messages;
create policy "members can send messages in their groups"
  on public.group_messages for insert
  with check (auth.uid() = sender_id and public._is_member_of_group_conversation(conversation_id, auth.uid()));
