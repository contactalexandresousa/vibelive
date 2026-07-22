-- rate_limit_events (0043) só registra tentativas PERMITIDAS (o insert
-- acontece depois da checagem passar) — não existe nenhum registro de
-- tentativa BLOQUEADA, então não dava pra responder "quantos bloqueios hoje"
-- nem pra admin. Tabela nova, só pra isso, sem mexer na lógica de contagem
-- já testada de _check_and_log_rate_limit (só adiciona 1 insert a mais no
-- caminho que já existia de bloqueio).
create table public.rate_limit_blocks (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_blocks_created_idx on public.rate_limit_blocks (created_at desc);
alter table public.rate_limit_blocks enable row level security;
-- Mesmo tratamento de rate_limit_events: sem policy nenhuma pro client, só
-- SECURITY DEFINER lê (get_admin_stats) ou escreve (_check_and_log_rate_limit).

create or replace function public._check_and_log_rate_limit(p_action text, p_max_count int, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select count(*) into v_count from public.rate_limit_events
    where user_id = v_uid and action = p_action and created_at > now() - p_window;

  if v_count >= p_max_count then
    insert into public.rate_limit_blocks (user_id, action) values (v_uid, p_action);
    raise exception 'Muitas ações em pouco tempo. Aguarde um pouco antes de tentar de novo.';
  end if;

  insert into public.rate_limit_events (user_id, action) values (v_uid, p_action);
end;
$$;

-- Enquanto mexia aqui: total_revenue_brl_cents só somava pix_payments desde
-- sempre — desde que existe pagamento por cartão (0058), a receita real fica
-- subestimada no painel. Soma os dois agora.
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
    'active_subscriptions', (select count(*) from public.creator_subscriptions where status = 'active' and current_period_end > now()),
    'total_revenue_brl_cents', (
      (select coalesce(sum(brl_amount * 100), 0)::bigint from public.pix_payments where status = 'approved')
      + (select coalesce(sum(brl_amount * 100), 0)::bigint from public.card_payments where status = 'approved')
    ),
    'rate_limit_blocks_today', (select count(*) from public.rate_limit_blocks where created_at > current_date)
  );
end;
$$;
