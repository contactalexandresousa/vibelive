-- Fotos de post, avatar e imagem de DM subiam sem nenhuma checagem de
-- conteúdo. Guarda um registro de todo upload bloqueado (mesmo padrão de
-- rate_limit_blocks/0069: tabela interna, sem policy nenhuma — só a Edge
-- Function moderate-image escreve aqui, via service role, e o admin lê pelo
-- stat abaixo). Diferente do rate limit, essa escrita NÃO acontece dentro de
-- um gatilho SQL — é a Edge Function chamando direto depois do upload, então
-- não tem risco nenhum de rollback de transação.
create table public.moderation_blocks (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  context text not null, -- 'avatar' | 'post' | 'dm'
  reason text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

alter table public.moderation_blocks enable row level security;

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
    'rate_limit_blocks_today', (select count(*) from public.rate_limit_blocks where created_at > current_date),
    'moderation_blocks_today', (select count(*) from public.moderation_blocks where created_at > current_date)
  );
end;
$$;
