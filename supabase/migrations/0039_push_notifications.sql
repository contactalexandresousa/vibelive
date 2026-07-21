-- Notificação push de verdade (fora do app, via navegador) pros três eventos
-- que já geram uma linha em notifications (novo seguidor, foi ao vivo,
-- convite pra live) e pra mensagem direta nova. pg_net manda a requisição
-- HTTP de forma assíncrona (não trava o insert que disparou o gatilho) pra
-- uma Edge Function que sabe falar o protocolo Web Push (VAPID).
create extension if not exists pg_net;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Chamada genérica: manda pra TODAS as inscrições (pode ter mais de um
-- navegador/aparelho) de um usuário. A Edge Function é "burra" de propósito
-- (só recebe título/corpo prontos) — quem decide o texto de cada evento é o
-- gatilho SQL mais próximo do evento, mesmo padrão de v_gift_label em
-- send_gift (migration 0029).
create function public._send_push(p_user_id uuid, p_title text, p_body text, p_url text default '/')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://mydudottsuvizwurrddz.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('user_id', p_user_id, 'title', p_title, 'body', p_body, 'url', p_url)
  );
end;
$$;

create function public._push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_name text;
  v_title text;
  v_body text;
begin
  select coalesce(display_name, username) into v_actor_name from public.profiles where id = new.actor_id;
  v_actor_name := coalesce(v_actor_name, 'Alguém');

  v_title := case new.type
    when 'new_follower' then 'Novo seguidor'
    when 'live_invite' then 'Convite pra live'
    when 'went_live' then 'Live agora'
    else 'VibeLive'
  end;
  v_body := case new.type
    when 'new_follower' then v_actor_name || ' começou a seguir você'
    when 'live_invite' then v_actor_name || ' te convidou pra uma live restrita'
    when 'went_live' then v_actor_name || ' está ao vivo agora!'
    else 'Você tem uma novidade no VibeLive.'
  end;

  perform public._send_push(new.user_id, v_title, v_body);
  return new;
end;
$$;

create trigger trg_push_on_notification
  after insert on public.notifications
  for each row execute function public._push_on_notification();

create function public._push_on_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_name text;
begin
  select coalesce(display_name, username) into v_sender_name from public.profiles where id = new.sender_id;
  perform public._send_push(new.recipient_id, coalesce(v_sender_name, 'Nova mensagem'), new.text);
  return new;
end;
$$;

create trigger trg_push_on_direct_message
  after insert on public.direct_messages
  for each row execute function public._push_on_direct_message();
