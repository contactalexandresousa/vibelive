-- Suspender hoje é beco sem saída pro usuário: só um toast com o motivo, sem
-- nenhum jeito de contestar. Como a conta suspensa não tem sessão (o login é
-- bloqueado antes de qualquer coisa — applyProfileToUI em app.js), o
-- formulário de recurso não pode depender de auth.uid(): identifica a conta
-- pelo @usuário, não por sessão.
create table public.account_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index account_appeals_status_idx on public.account_appeals (status, created_at desc);

alter table public.account_appeals enable row level security;

-- Só admin lê — o usuário suspenso não tem sessão pra ler mesmo, e a policy
-- não precisa cobrir esse caso.
create policy "admins read appeals"
  on public.account_appeals for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Sem auth.uid() disponível (usuário suspenso não tem sessão), então esta
-- função fica com o grant padrão de PUBLIC de propósito — é a única RPC
-- deste projeto pensada pra ser chamada por alguém sem sessão nenhuma. Só
-- aceita recurso pra conta que realmente está suspensa (não dá pra abrir
-- recurso "preventivo" pra conta normal) e limita 3 por conta a cada 24h.
create function public.submit_account_appeal(p_username text, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_is_suspended boolean;
  v_recent_count int;
begin
  select id, is_suspended into v_user_id, v_is_suspended
    from public.profiles where username = lower(trim(p_username));

  if v_user_id is null then
    raise exception 'Não encontramos essa conta.';
  end if;
  if not coalesce(v_is_suspended, false) then
    raise exception 'Essa conta não está suspensa.';
  end if;
  if trim(coalesce(p_message, '')) = '' then
    raise exception 'Escreva uma mensagem explicando seu recurso.';
  end if;

  select count(*) into v_recent_count from public.account_appeals
    where user_id = v_user_id and created_at > now() - interval '24 hours';
  if v_recent_count >= 3 then
    raise exception 'Muitos recursos enviados recentemente. Aguarde antes de tentar de novo.';
  end if;

  if exists (select 1 from public.account_appeals where user_id = v_user_id and status = 'pending') then
    raise exception 'Você já tem um recurso em análise pra essa conta.';
  end if;

  insert into public.account_appeals (user_id, message) values (v_user_id, trim(p_message));
end;
$$;

create function public.admin_review_appeal(p_appeal_id uuid, p_approve boolean, p_admin_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_user_id uuid;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem revisar recursos.';
  end if;

  update public.account_appeals
  set status = case when p_approve then 'approved' else 'denied' end,
      admin_notes = p_admin_notes,
      reviewed_at = now()
  where id = p_appeal_id and status = 'pending'
  returning user_id into v_user_id;

  if v_user_id is null then
    raise exception 'Recurso não encontrado ou já revisado.';
  end if;

  if p_approve then
    perform public.admin_unsuspend_user(v_user_id);
  end if;

  perform public._log_admin_action(
    case when p_approve then 'appeal_approved' else 'appeal_denied' end,
    v_user_id,
    jsonb_build_object('admin_notes', p_admin_notes)
  );
end;
$$;
