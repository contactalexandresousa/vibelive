-- Só admin marcava conta como verificada manualmente até agora — sem
-- nenhum jeito do usuário sequer pedir. Reaproveita o sistema de recurso já
-- existente (0067 + 0085, mesmo padrão de fila de revisão do admin), só com
-- um terceiro "type". Diferente dos outros dois tipos, quem pede aqui está
-- logado normalmente (não é suspensão nem lockout de 2FA), então usa
-- auth.uid() direto em vez de receber p_username.
alter table public.account_appeals drop constraint account_appeals_type_check;
alter table public.account_appeals add constraint account_appeals_type_check
  check (type in ('suspension', 'mfa_lockout', 'verification_request'));

create function public.submit_verification_request(p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_is_verified boolean;
  v_recent_count int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select is_verified into v_is_verified from public.profiles where id = v_uid;
  if coalesce(v_is_verified, false) then
    raise exception 'Sua conta já é verificada.';
  end if;
  if trim(coalesce(p_message, '')) = '' then
    raise exception 'Explique por que sua conta deveria ser verificada.';
  end if;

  select count(*) into v_recent_count from public.account_appeals
    where user_id = v_uid and type = 'verification_request' and created_at > now() - interval '7 days';
  if v_recent_count >= 1 then
    raise exception 'Você já enviou um pedido de verificação recentemente. Aguarde a análise.';
  end if;

  if exists (select 1 from public.account_appeals where user_id = v_uid and type = 'verification_request' and status = 'pending') then
    raise exception 'Você já tem um pedido de verificação em análise.';
  end if;

  insert into public.account_appeals (user_id, message, type) values (v_uid, trim(p_message), 'verification_request');
end;
$$;

-- Corpo igual ao já publicado (conferido via pg_get_functiondef antes de
-- mexer), só troca o if/else de 2 ramos por um if/elsif de 3.
create or replace function public.admin_review_appeal(p_appeal_id uuid, p_approve boolean, p_admin_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_user_id uuid;
  v_type text;
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
  returning user_id, type into v_user_id, v_type;

  if v_user_id is null then
    raise exception 'Recurso não encontrado ou já revisado.';
  end if;

  if p_approve then
    if v_type = 'mfa_lockout' then
      delete from auth.mfa_factors where user_id = v_user_id;
      delete from public.mfa_backup_codes where user_id = v_user_id;
    elsif v_type = 'verification_request' then
      update public.profiles set is_verified = true where id = v_user_id;
    else
      perform public.admin_unsuspend_user(v_user_id);
    end if;
  end if;

  perform public._log_admin_action(
    case when p_approve then 'appeal_approved' else 'appeal_denied' end,
    v_user_id,
    jsonb_build_object('admin_notes', p_admin_notes, 'type', v_type)
  );
end;
$$;
