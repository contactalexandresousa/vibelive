-- Notificações reais: o sino hoje é decorativo (o pontinho vermelho fica
-- sempre aceso, e clicar só mostra um toast fixo dizendo "sem notificações").
-- Passa a existir de verdade pra dois eventos: alguém te seguir e alguém que
-- você segue entrar ao vivo. Mensagem direta já tem indicador próprio
-- (badge de não lidas na barra inferior) — não duplica aqui.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade, -- quem recebe
  type text not null check (type in ('new_follower', 'went_live')),
  actor_id uuid references public.profiles(id) on delete set null, -- quem causou o evento
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "users read their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
-- Sem policy de insert: só os triggers abaixo (SECURITY DEFINER) escrevem aqui.

alter publication supabase_realtime add table public.notifications;

-- follows.followed_handle é texto solto (era pensado só pra streamers
-- mockados) — resolve pro id real via username pra notificar a pessoa certa.
create function public._notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_followed_id uuid;
begin
  select id into v_followed_id from public.profiles where username = new.followed_handle;
  if v_followed_id is not null and v_followed_id <> new.follower_id then
    insert into public.notifications (user_id, type, actor_id)
    values (v_followed_id, 'new_follower', new.follower_id);
  end if;
  return new;
end;
$$;

create trigger trg_notify_new_follower
  after insert on public.follows
  for each row execute function public._notify_new_follower();

create function public._notify_followers_went_live()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
begin
  select username into v_username from public.profiles where id = new.user_id;
  if v_username is not null then
    insert into public.notifications (user_id, type, actor_id)
    select f.follower_id, 'went_live', new.user_id
    from public.follows f
    where f.followed_handle = v_username;
  end if;
  return new;
end;
$$;

create trigger trg_notify_followers_went_live
  after insert on public.live_sessions
  for each row execute function public._notify_followers_went_live();
