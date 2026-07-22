-- Achado real ao revisar a rodada anterior: 0081 fez o 2FA valer de verdade
-- no servidor, o que é ótimo — mas expôs um problema que não existia antes
-- (quando 2FA era "de mentirinha", dava sempre pra contornar): quem perde o
-- celular E os códigos de backup fica trancado pra sempre. O próprio login
-- já bloqueia antes de chegar em qualquer RPC (showMfaChallenge trava tudo),
-- então não existe NENHUM caminho de volta hoje.
--
-- Reaproveita o sistema de recurso (0067) que já funciona sem sessão — só
-- adiciona um tipo novo. "Aprovar" um recurso de mfa_lockout tem um
-- significado diferente de aprovar suspensão: apaga o fator TOTP e os
-- códigos de backup da conta (testado ao vivo: apagar auth.mfa_factors
-- direto derruba a exigência de aal2 no próximo login, igual um unenroll
-- normal) — a pessoa volta a entrar só com senha, e pode configurar 2FA de
-- novo depois se quiser.
alter table public.account_appeals add column type text not null default 'suspension'
  check (type in ('suspension', 'mfa_lockout'));

create function public.submit_mfa_lockout_appeal(p_username text, p_message text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_has_mfa boolean;
  v_recent_count int;
begin
  select id into v_user_id from public.profiles where username = lower(trim(p_username));
  if v_user_id is null then
    raise exception 'Não encontramos essa conta.';
  end if;

  select exists(
    select 1 from auth.mfa_factors where user_id = v_user_id and factor_type = 'totp' and status = 'verified'
  ) into v_has_mfa;
  if not v_has_mfa then
    raise exception 'Essa conta não tem autenticação em duas etapas ativada.';
  end if;

  if trim(coalesce(p_message, '')) = '' then
    raise exception 'Escreva uma mensagem explicando sua situação.';
  end if;

  select count(*) into v_recent_count from public.account_appeals
    where user_id = v_user_id and type = 'mfa_lockout' and created_at > now() - interval '24 hours';
  if v_recent_count >= 3 then
    raise exception 'Muitos pedidos enviados recentemente. Aguarde antes de tentar de novo.';
  end if;

  if exists (select 1 from public.account_appeals where user_id = v_user_id and type = 'mfa_lockout' and status = 'pending') then
    raise exception 'Você já tem um pedido de recuperação em análise pra essa conta.';
  end if;

  insert into public.account_appeals (user_id, message, type) values (v_user_id, trim(p_message), 'mfa_lockout');
end;
$$;

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
