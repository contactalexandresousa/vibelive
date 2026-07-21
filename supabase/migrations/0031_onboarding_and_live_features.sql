-- Marca se a pessoa já passou pelo assistente de perfil (foto, nome, @, bio)
-- depois de criar a conta. Contas antigas (só a admin restante) já começam
-- como concluído, pra não forçar o assistente em quem já tem perfil configurado.
alter table public.profiles add column onboarding_completed boolean not null default false;
update public.profiles set onboarding_completed = true;

-- ==========================================================================
-- LIVE COM SENHA
-- ==========================================================================
-- live_sessions é lida por qualquer um (política "anyone can read live
-- sessions" using (true)) — guardar o hash da senha ali seria exposto pra
-- qualquer cliente que decidisse consultar essa coluna direto pela API,
-- mesmo sem usar a tela. Por isso o hash fica numa tabela própria, sem
-- NENHUMA policy de select — só a função abaixo (SECURITY DEFINER) enxerga.
create extension if not exists pgcrypto with schema extensions;

alter table public.live_sessions add column has_password boolean not null default false;

create table public.live_session_passwords (
  live_session_id uuid primary key references public.live_sessions(id) on delete cascade,
  password_hash text not null
);

alter table public.live_session_passwords enable row level security;
-- Nenhuma policy criada de propósito: ninguém lê essa tabela pela API, nem o
-- dono da live — só a função set_live_session_password/check_live_session_password.

create or replace function public.set_live_session_password(p_room_name text, p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  select id into v_session_id from public.live_sessions
    where room_name = p_room_name and user_id = auth.uid() and ended_at is null;
  if v_session_id is null then
    raise exception 'Live não encontrada ou não é sua';
  end if;

  if p_password is null or length(p_password) = 0 then
    delete from public.live_session_passwords where live_session_id = v_session_id;
    update public.live_sessions set has_password = false where id = v_session_id;
  else
    insert into public.live_session_passwords (live_session_id, password_hash)
      values (v_session_id, extensions.crypt(p_password, extensions.gen_salt('bf')))
      on conflict (live_session_id) do update set password_hash = excluded.password_hash;
    update public.live_sessions set has_password = true where id = v_session_id;
  end if;
end;
$$;

create or replace function public.check_live_session_password(p_room_name text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_session_id uuid;
begin
  select id into v_session_id from public.live_sessions where room_name = p_room_name and ended_at is null;
  if v_session_id is null then
    return false;
  end if;

  select password_hash into v_hash from public.live_session_passwords where live_session_id = v_session_id;
  if v_hash is null then
    return true; -- sem senha cadastrada, entrada livre
  end if;

  return v_hash = extensions.crypt(p_password, v_hash);
end;
$$;

-- ==========================================================================
-- LIVE COM CONVIDADOS (acesso restrito a seguidores mútuos convidados)
-- ==========================================================================
alter table public.live_sessions add column invite_only boolean not null default false;

create table public.live_session_invites (
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (live_session_id, invited_user_id)
);

alter table public.live_session_invites enable row level security;

-- Quem foi convidado precisa conseguir ver o próprio convite (pra saber que
-- pode entrar); quem transmite também vê a própria lista de convidados.
create policy "invited user or host can read invite"
  on public.live_session_invites for select
  using (
    auth.uid() = invited_user_id
    or exists (select 1 from public.live_sessions s where s.id = live_session_id and s.user_id = auth.uid())
  );

-- Só quem está transmitindo convida, e só quem segue E é seguido de volta
-- por quem transmite (seguidor mútuo) pode ser convidado — reforçado aqui,
-- não só na UI.
create policy "host invites mutual followers to own live session"
  on public.live_session_invites for insert
  with check (
    exists (select 1 from public.live_sessions s where s.id = live_session_id and s.user_id = auth.uid())
    and exists (
      select 1 from public.follows f1
      where f1.follower_id = auth.uid()
        and f1.followed_handle = (select username from public.profiles where id = invited_user_id)
    )
    and exists (
      select 1 from public.follows f2
      where f2.follower_id = invited_user_id
        and f2.followed_handle = (select username from public.profiles where id = auth.uid())
    )
  );

create policy "host removes own invite"
  on public.live_session_invites for delete
  using (exists (select 1 from public.live_sessions s where s.id = live_session_id and s.user_id = auth.uid()));
