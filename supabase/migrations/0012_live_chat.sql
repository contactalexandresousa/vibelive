-- Chat real da sala de live: mensagens ficam persistidas e são transmitidas
-- via Supabase Realtime para todo mundo assistindo à mesma "sala" (broadcaster_handle).
-- Antes desta migration, o chat era só local por aba — cada pessoa via só as
-- próprias mensagens, ninguém mais.
create table public.live_chat_messages (
  id uuid primary key default gen_random_uuid(),
  broadcaster_handle text not null,
  user_id uuid references public.profiles(id) on delete set null,
  username text not null,
  text text not null check (char_length(text) between 1 and 300),
  type text not null default 'chat' check (type in ('chat', 'gift')),
  created_at timestamptz not null default now()
);

create index live_chat_messages_room_idx on public.live_chat_messages (broadcaster_handle, created_at);

alter table public.live_chat_messages enable row level security;

-- Chat público: qualquer um (incluindo visitante não logado que só está olhando) pode ler.
create policy "anyone can read live chat"
  on public.live_chat_messages for select
  using (true);

-- Cliente só pode inserir mensagem de texto em próprio nome. Mensagens tipo
-- 'gift' só entram via RPC SECURITY DEFINER (send_gift/send_quick_rose), que
-- já roda com privilégio elevado e não passa por esta policy.
create policy "authenticated users send their own chat message"
  on public.live_chat_messages for insert
  with check (auth.uid() = user_id and type = 'chat');

alter publication supabase_realtime add table public.live_chat_messages;

-- Presentes na sala agora também aparecem no chat de todo mundo, não só em quem enviou.
create or replace function public.send_gift(p_gift_code text, p_broadcaster_handle text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price int;
  v_uid uuid := auth.uid();
  v_gift_label text;
  v_username text;
begin
  v_price := case p_gift_code
    when 'rosa' then 1
    when 'chocolate' then 5
    when 'diamante' then 25
    when 'coroa_vip' then 100
    when 'super_carro' then 500
    when 'castelo' then 1000
    else null
  end;
  if v_price is null then
    raise exception 'Presente inválido';
  end if;

  v_gift_label := case p_gift_code
    when 'rosa' then 'Rosa 🌹'
    when 'chocolate' then 'Chocolate 🍫'
    when 'diamante' then 'Diamante 💎'
    when 'coroa_vip' then 'Coroa VIP 👑'
    when 'super_carro' then 'Super Carro 🚗'
    when 'castelo' then 'Castelo 🏰'
  end;

  perform public._spend_coins(v_price, 'gift', jsonb_build_object('gift_code', p_gift_code, 'broadcaster', p_broadcaster_handle));

  if p_broadcaster_handle is not null then
    select coalesce(display_name, username) into v_username from public.profiles where id = v_uid;
    insert into public.live_chat_messages (broadcaster_handle, user_id, username, text, type)
      values (p_broadcaster_handle, v_uid, v_username, 'enviou ' || v_gift_label, 'gift');
  end if;

  return (select p from public.profiles p where id = v_uid);
end;
$$;

create or replace function public.send_quick_rose(p_broadcaster_handle text default null)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_username text;
begin
  perform public._spend_coins(1, 'quick_rose');

  if p_broadcaster_handle is not null then
    select coalesce(display_name, username) into v_username from public.profiles where id = v_uid;
    insert into public.live_chat_messages (broadcaster_handle, user_id, username, text, type)
      values (p_broadcaster_handle, v_uid, v_username, 'enviou uma Rosa 🌹', 'gift');
  end if;

  return (select p from public.profiles p where id = v_uid);
end;
$$;
