-- Ações de moderação (suspender, verificar, revisar saque, revisar denúncia)
-- não deixavam rastro nenhum de quem fez o quê e quando — só o estado final.
-- Importa no dia em que houver mais de um admin. Sem policy de insert pro
-- client: só as próprias RPCs de admin (SECURITY DEFINER) escrevem aqui.
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

create policy "admins read audit log"
  on public.admin_audit_log for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create function public._log_admin_action(p_action text, p_target_user_id uuid, p_details jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_audit_log (admin_id, action, target_user_id, details)
    values (auth.uid(), p_action, p_target_user_id, p_details);
end;
$$;

create or replace function public.admin_suspend_user(p_user_id uuid, p_reason text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_target public.profiles;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem suspender contas.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Não é possível suspender a própria conta.';
  end if;

  update public.profiles
  set is_suspended = true, suspended_reason = p_reason
  where id = p_user_id
  returning * into v_target;

  if v_target.id is null then
    raise exception 'Usuário não encontrado.';
  end if;

  perform public._log_admin_action('suspend_user', p_user_id, jsonb_build_object('reason', p_reason));
  return v_target;
end;
$$;

create or replace function public.admin_unsuspend_user(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_target public.profiles;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem reativar contas.';
  end if;

  update public.profiles
  set is_suspended = false, suspended_reason = null
  where id = p_user_id
  returning * into v_target;

  if v_target.id is null then
    raise exception 'Usuário não encontrado.';
  end if;

  perform public._log_admin_action('unsuspend_user', p_user_id, '{}'::jsonb);
  return v_target;
end;
$$;

create or replace function public.admin_set_verified(p_user_id uuid, p_verified boolean)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_target public.profiles;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem conceder o selo de verificado.';
  end if;

  update public.profiles
  set is_verified = p_verified
  where id = p_user_id
  returning * into v_target;

  if v_target.id is null then
    raise exception 'Usuário não encontrado.';
  end if;

  perform public._log_admin_action(case when p_verified then 'verify_user' else 'unverify_user' end, p_user_id, '{}'::jsonb);
  return v_target;
end;
$$;

create or replace function public.review_withdrawal_request(p_request_id uuid, p_new_status text, p_admin_notes text default null)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_request public.withdrawal_requests;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem revisar saques.';
  end if;
  if p_new_status not in ('approved', 'rejected', 'paid') then
    raise exception 'Status inválido.';
  end if;

  select * into v_request from public.withdrawal_requests where id = p_request_id for update;
  if v_request is null then
    raise exception 'Solicitação não encontrada.';
  end if;
  if v_request.status <> 'pending' and p_new_status = 'rejected' then
    raise exception 'Só é possível rejeitar solicitações pendentes.';
  end if;

  if p_new_status = 'rejected' then
    update public.profiles set coins = coins + v_request.coins_amount where id = v_request.user_id;
    insert into public.wallet_transactions (user_id, amount, type, metadata)
      values (v_request.user_id, v_request.coins_amount, 'withdrawal_refund', jsonb_build_object('request_id', v_request.id));
  end if;

  update public.withdrawal_requests
  set status = p_new_status,
      admin_notes = coalesce(p_admin_notes, admin_notes),
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_request_id
  returning * into v_request;

  insert into public.notifications (user_id, type, metadata)
    values (v_request.user_id, 'withdrawal_reviewed', jsonb_build_object(
      'status', p_new_status, 'coins_amount', v_request.coins_amount, 'request_id', v_request.id
    ));

  perform public._log_admin_action('review_withdrawal', v_request.user_id, jsonb_build_object(
    'status', p_new_status, 'request_id', v_request.id, 'coins_amount', v_request.coins_amount
  ));

  return v_request;
end;
$$;

-- Denúncia é marcada como revisada via UPDATE direto (RLS já restringe a
-- admin — migration 0027), não RPC — trigger é o jeito de logar sem
-- reescrever esse fluxo que já funciona.
create function public._log_report_reviewed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reviewed_at is not null and old.reviewed_at is null then
    perform public._log_admin_action('review_report', new.reported_id, jsonb_build_object('report_id', new.id));
  end if;
  return new;
end;
$$;

create trigger trg_log_report_reviewed
  after update on public.user_reports
  for each row execute function public._log_report_reviewed();
