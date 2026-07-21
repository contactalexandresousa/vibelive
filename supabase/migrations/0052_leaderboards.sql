-- Ranking dos últimos 30 dias, não vitalício — mantém relevante quem está
-- ativo agora, não trava no topo pra sempre por causa de atividade antiga.
-- Contas suspensas ficam de fora dos dois rankings.
create function public.get_top_supporters(p_limit int default 20)
returns table (user_id uuid, username text, display_name text, avatar_url text, total_spent bigint)
language sql
stable
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url, sum(-wt.amount)::bigint as total_spent
  from public.wallet_transactions wt
  join public.profiles p on p.id = wt.user_id
  where wt.type in ('gift', 'quick_rose', 'pk_support')
    and wt.created_at > now() - interval '30 days'
    and p.is_suspended = false
  group by p.id, p.username, p.display_name, p.avatar_url
  order by total_spent desc
  limit p_limit;
$$;

create function public.get_top_creators(p_limit int default 20)
returns table (user_id uuid, username text, display_name text, avatar_url text, total_earned bigint)
language sql
stable
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url, sum(wt.amount)::bigint as total_earned
  from public.wallet_transactions wt
  join public.profiles p on p.id = wt.user_id
  where wt.type in ('gift_received', 'quick_rose_received', 'private_content_sale', 'subscription_income')
    and wt.created_at > now() - interval '30 days'
    and p.is_suspended = false
  group by p.id, p.username, p.display_name, p.avatar_url
  order by total_earned desc
  limit p_limit;
$$;
