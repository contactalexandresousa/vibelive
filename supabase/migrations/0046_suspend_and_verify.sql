-- Os Termos de Uso já prometem que moderação "pode remover conteúdo,
-- suspender ou encerrar contas" — até aqui isso não existia de verdade, o
-- painel de denúncias só marcava "revisada" sem nenhum efeito real. E todo
-- perfil mostrava um ✓ de "verificado" fixo no nome (decoração do protótipo
-- original, sem checagem nenhuma por trás) — agora vira uma flag real,
-- controlada só pelo admin.
alter table public.profiles add column is_suspended boolean not null default false;
alter table public.profiles add column suspended_reason text;
alter table public.profiles add column is_verified boolean not null default false;

-- Mesma trava das colunas de economia (0010/0011/0027): sem isso, qualquer
-- pessoa logada poderia se auto-verificar ou remover a própria suspensão
-- com um UPDATE direto na própria linha.
create or replace function public._protect_profile_economy()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'supabase_admin') then
    new.coins := old.coins;
    new.xp := old.xp;
    new.level := old.level;
    new.is_vip := old.is_vip;
    new.is_admin := old.is_admin;
    new.is_suspended := old.is_suspended;
    new.suspended_reason := old.suspended_reason;
    new.is_verified := old.is_verified;
  end if;
  return new;
end;
$$;

create function public.admin_suspend_user(p_user_id uuid, p_reason text)
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
  return v_target;
end;
$$;

create function public.admin_unsuspend_user(p_user_id uuid)
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
  return v_target;
end;
$$;

create function public.admin_set_verified(p_user_id uuid, p_verified boolean)
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
  return v_target;
end;
$$;

-- Esconde posts de conta suspensa da leitura pública, sem apagar nada — o
-- próprio dono (se conseguisse logar, o que o cliente já impede) e o admin
-- continuam vendo.
drop policy "public posts readable by anyone, private posts by unlockers or subscribers" on public.posts;

create policy "posts readable unless author suspended, private gated by unlock or subscription"
  on public.posts for select
  using (
    (
      not is_private
      or auth.uid() = user_id
      or exists (
        select 1 from public.private_content_unlocks u
        where u.creator_id = posts.user_id and u.unlocker_id = auth.uid()
      )
      or exists (
        select 1 from public.creator_subscriptions s
        where s.creator_id = posts.user_id and s.subscriber_id = auth.uid()
          and s.status = 'active' and s.current_period_end > now()
      )
    )
    and (
      not exists (select 1 from public.profiles p where p.id = posts.user_id and p.is_suspended = true)
      or auth.uid() = user_id
      or exists (select 1 from public.profiles admin where admin.id = auth.uid() and admin.is_admin = true)
    )
  );

-- Painel geral: números agregados que só fazem sentido pro admin ver de uma vez.
create function public.get_admin_stats()
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
    'total_revenue_brl_cents', (select coalesce(sum(brl_amount * 100), 0)::bigint from public.pix_payments where status = 'approved')
  );
end;
$$;
