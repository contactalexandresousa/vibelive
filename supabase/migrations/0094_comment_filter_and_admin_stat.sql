-- Filtro de palavrões (0061) só cobria chat da live e legenda de post —
-- comentário (e resposta, já que parent_id cobre os dois no mesmo insert)
-- passava reto, mesmo sendo conteúdo tão público quanto legenda.
create function public._censor_comment_text()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.text := public._censor_text(new.text);
  return new;
end;
$$;

create trigger trg_censor_comment_text
  before insert on public.post_comments
  for each row execute function public._censor_comment_text();

-- Painel de estatísticas mostrava "denúncias pendentes" mas não "recursos
-- pendentes" (suspensão + recuperação de 2FA, 0067/0085) — só dava pra saber
-- abrindo o painel específico.
create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem ver essas estatísticas.';
  end if;

  return jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'suspended_users', (select count(*) from public.profiles where is_suspended = true),
    'verified_users', (select count(*) from public.profiles where is_verified = true),
    'total_coins_in_circulation', (select coalesce(sum(coins), 0) from public.profiles),
    'active_lives', (select count(*) from public.live_sessions where ended_at is null),
    'pending_withdrawals', (select count(*) from public.withdrawal_requests where status = 'pending'),
    'pending_withdrawals_coins', (select coalesce(sum(coins_amount), 0) from public.withdrawal_requests where status = 'pending'),
    'pending_reports', (select count(*) from public.user_reports where reviewed_at is null),
    'pending_appeals', (select count(*) from public.account_appeals where status = 'pending'),
    'active_subscriptions', (select count(*) from public.creator_subscriptions where status = 'active' and current_period_end > now()),
    'total_revenue_brl_cents', (
      (select coalesce(sum(brl_amount * 100), 0)::bigint from public.pix_payments where status = 'approved')
      + (select coalesce(sum(brl_amount * 100), 0)::bigint from public.card_payments where status = 'approved')
    ),
    'rate_limit_blocks_today', (select count(*) from public.rate_limit_blocks where created_at > current_date),
    'moderation_blocks_today', (select count(*) from public.moderation_blocks where created_at > current_date)
  );
end;
$$;
