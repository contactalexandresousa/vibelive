-- Painel de ganhos do criador: quebra por origem (presente, rosa, conteúdo
-- privado, assinatura) + série diária pra um gráfico simples. Não precisa de
-- SECURITY DEFINER — só agrega linhas que o próprio usuário já enxerga via
-- RLS de wallet_transactions ("users read own transactions", migration 0002).
create function public.get_earnings_summary()
returns table (type text, total bigint, tx_count bigint)
language sql
stable
set search_path = ''
as $$
  select type, sum(amount)::bigint as total, count(*)::bigint as tx_count
  from public.wallet_transactions
  where user_id = auth.uid()
    and type in ('gift_received', 'quick_rose_received', 'private_content_sale', 'subscription_income')
  group by type;
$$;

create function public.get_earnings_by_day(p_days int default 14)
returns table (day date, total bigint)
language sql
stable
set search_path = ''
as $$
  select date_trunc('day', created_at)::date as day, sum(amount)::bigint as total
  from public.wallet_transactions
  where user_id = auth.uid()
    and type in ('gift_received', 'quick_rose_received', 'private_content_sale', 'subscription_income')
    and created_at > now() - (p_days || ' days')::interval
  group by day
  order by day;
$$;
