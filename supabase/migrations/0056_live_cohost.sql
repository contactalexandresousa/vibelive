-- Co-transmissão: duas pessoas na mesma live ao mesmo tempo. Reaproveita a
-- mesma regra de "seguidor mútuo" já usada pra convite de live restrita
-- (0031), mas numa tabela própria — convite pra ASSISTIR e convite pra
-- CO-TRANSMITIR são coisas diferentes (aceitar um não deveria implicar o
-- outro). Fluxo: convite -> aceite -> o token do LiveKit (edge function)
-- passa a conceder permissão de publicar pro convidado nessa sala específica.
create table public.live_cohost_invites (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null references public.live_sessions(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'ended')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (live_session_id, invited_user_id)
);

create index live_cohost_invites_session_idx on public.live_cohost_invites (live_session_id);

alter table public.live_cohost_invites enable row level security;

create policy "invited user or host can read cohost invite"
  on public.live_cohost_invites for select
  using (
    auth.uid() = invited_user_id
    or exists (select 1 from public.live_sessions s where s.id = live_session_id and s.user_id = auth.uid())
  );

-- Mesma trava de seguidor mútuo do convite de live restrita (0031) — só
-- reforça mais uma vez que ISSO É uma decisão de segurança, não estilo.
create policy "host invites mutual followers as cohost"
  on public.live_cohost_invites for insert
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

create policy "invited user responds to own invite"
  on public.live_cohost_invites for update
  using (auth.uid() = invited_user_id and status = 'pending')
  with check (auth.uid() = invited_user_id);

create policy "host ends an active cohost"
  on public.live_cohost_invites for update
  using (exists (select 1 from public.live_sessions s where s.id = live_session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.live_sessions s where s.id = live_session_id and s.user_id = auth.uid()));

alter publication supabase_realtime add table public.live_cohost_invites;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('new_follower', 'went_live', 'live_invite', 'withdrawal_reviewed', 'subscription_expired', 'cohost_invite'));

create or replace function public._push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_name text;
  v_title text;
  v_body text;
  v_status text;
  v_coins int;
  v_creator_name text;
  v_prefs jsonb;
begin
  select push_preferences into v_prefs from public.profiles where id = new.user_id;
  if coalesce((v_prefs->>new.type)::boolean, true) = false then
    return new; -- usuário desativou push pra esse tipo específico
  end if;

  select coalesce(display_name, username) into v_actor_name from public.profiles where id = new.actor_id;
  v_actor_name := coalesce(v_actor_name, 'Alguém');

  if new.type = 'withdrawal_reviewed' then
    v_status := new.metadata->>'status';
    v_coins := (new.metadata->>'coins_amount')::int;
    v_title := 'Saque atualizado';
    v_body := case v_status
      when 'paid' then 'Seu saque de 🪙' || v_coins || ' foi pago!'
      when 'approved' then 'Seu saque de 🪙' || v_coins || ' foi aprovado.'
      when 'rejected' then 'Seu saque de 🪙' || v_coins || ' foi rejeitado — as moedas voltaram pra sua carteira.'
      else 'Seu pedido de saque foi atualizado.'
    end;
    perform public._send_push(new.user_id, v_title, v_body);
    return new;
  end if;

  if new.type = 'subscription_expired' then
    select coalesce(display_name, username) into v_creator_name
      from public.profiles where id = (new.metadata->>'creator_id')::uuid;
    perform public._send_push(new.user_id, 'Assinatura expirou',
      'Sua assinatura de ' || coalesce(v_creator_name, 'um criador') || ' expirou por falta de saldo.');
    return new;
  end if;

  if new.type = 'cohost_invite' then
    perform public._send_push(new.user_id, 'Convite pra co-transmitir', v_actor_name || ' te chamou pra co-transmitir uma live!');
    return new;
  end if;

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

create function public.invite_cohost(p_live_session_id uuid, p_invited_user_id uuid)
returns public.live_cohost_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_host_id uuid;
  v_invite public.live_cohost_invites;
begin
  select user_id into v_host_id from public.live_sessions where id = p_live_session_id and ended_at is null;
  if v_host_id is null or v_host_id <> v_uid then
    raise exception 'Só quem está transmitindo pode convidar um co-transmissor.';
  end if;
  if p_invited_user_id = v_uid then
    raise exception 'Não é possível se convidar.';
  end if;

  insert into public.live_cohost_invites (live_session_id, invited_user_id)
    values (p_live_session_id, p_invited_user_id)
    on conflict (live_session_id, invited_user_id) do update set status = 'pending', responded_at = null
    returning * into v_invite;

  insert into public.notifications (user_id, type, actor_id, metadata)
    values (p_invited_user_id, 'cohost_invite', v_uid, jsonb_build_object('invite_id', v_invite.id, 'live_session_id', p_live_session_id));

  return v_invite;
end;
$$;

create function public.respond_cohost_invite(p_invite_id uuid, p_accept boolean)
returns public.live_cohost_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.live_cohost_invites;
begin
  select * into v_invite from public.live_cohost_invites where id = p_invite_id for update;
  if v_invite.id is null or v_invite.invited_user_id <> v_uid then
    raise exception 'Convite não encontrado.';
  end if;
  if v_invite.status <> 'pending' then
    raise exception 'Esse convite já foi respondido.';
  end if;

  update public.live_cohost_invites
  set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
  where id = p_invite_id
  returning * into v_invite;

  return v_invite;
end;
$$;

create function public.end_cohost(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  update public.live_cohost_invites lci
  set status = 'ended'
  where lci.id = p_invite_id
    and (
      lci.invited_user_id = v_uid
      or exists (select 1 from public.live_sessions s where s.id = lci.live_session_id and s.user_id = v_uid)
    );
end;
$$;
