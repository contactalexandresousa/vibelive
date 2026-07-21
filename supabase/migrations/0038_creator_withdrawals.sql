-- Saque real de moedas pra criadores. Até aqui o PIX só entrava (comprar
-- moedas) — quem recebia presente/desbloqueio de conteúdo nunca conseguia
-- converter isso em dinheiro de verdade, então o ciclo de monetização ficava
-- pela metade. O pagamento em si (mandar o PIX de fato) continua manual pelo
-- admin fora do app — automatizar saque de dinheiro via API é um nível de
-- risco/regulação que não faz sentido só com o Checkout do Mercado Pago
-- (que só recebe, não manda PIX). O que este app garante de verdade é o
-- registro: moedas saem da carteira na hora do pedido (evita saque duplicado
-- do mesmo saldo) e voltam automaticamente se o admin rejeitar.
create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coins_amount int not null check (coins_amount > 0),
  amount_brl_cents int not null,
  pix_key text not null,
  pix_key_type text not null check (pix_key_type in ('cpf', 'email', 'phone', 'random')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  admin_notes text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create index withdrawal_requests_user_idx on public.withdrawal_requests (user_id, requested_at desc);
create index withdrawal_requests_status_idx on public.withdrawal_requests (status) where status = 'pending';

alter table public.withdrawal_requests enable row level security;

create policy "users view own withdrawal requests"
  on public.withdrawal_requests for select
  using (auth.uid() = user_id);

create policy "admins view all withdrawal requests"
  on public.withdrawal_requests for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "admins update withdrawal requests"
  on public.withdrawal_requests for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
-- Sem policy de insert: só request_withdrawal() (SECURITY DEFINER) grava aqui.

alter table public.wallet_transactions drop constraint wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in (
    'gift', 'gift_received', 'quick_rose', 'quick_rose_received',
    'pk_support', 'vip_purchase', 'roulette_spin', 'daily_checkin', 'pix_recharge',
    'withdrawal_request', 'withdrawal_refund'
  ));

-- Taxa e mínimo fixados aqui dentro (não vêm do cliente) — mesmo padrão de
-- toda RPC de carteira já usada no app: quem chama só escolhe QUANTAS moedas,
-- nunca A QUANTIA em reais.
create function public.request_withdrawal(p_coins int, p_pix_key text, p_pix_key_type text)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_min_coins constant int := 500;
  v_rate_cents constant int := 3; -- R$ 0,03 por moeda
  v_uid uuid := auth.uid();
  v_coins int;
  v_request public.withdrawal_requests;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if p_coins is null or p_coins < v_min_coins then
    raise exception 'O saque mínimo é de % moedas.', v_min_coins;
  end if;
  if p_pix_key_type not in ('cpf', 'email', 'phone', 'random') then
    raise exception 'Tipo de chave PIX inválido.';
  end if;
  if p_pix_key is null or length(trim(p_pix_key)) = 0 then
    raise exception 'Informe uma chave PIX válida.';
  end if;

  select coins into v_coins from public.profiles where id = v_uid for update;
  if v_coins < p_coins then
    raise exception 'Saldo de moedas insuficiente.';
  end if;

  update public.profiles set coins = coins - p_coins where id = v_uid;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (v_uid, -p_coins, 'withdrawal_request', jsonb_build_object('pix_key_type', p_pix_key_type));

  insert into public.withdrawal_requests (user_id, coins_amount, amount_brl_cents, pix_key, pix_key_type)
    values (v_uid, p_coins, p_coins * v_rate_cents, trim(p_pix_key), p_pix_key_type)
    returning * into v_request;

  return v_request;
end;
$$;

-- Só admin revisa. Rejeitar devolve as moedas pra carteira de quem pediu;
-- aprovar/marcar como pago só muda o status (o PIX em si já foi mandado
-- manualmente pelo admin fora do app antes de clicar aqui).
create function public.review_withdrawal_request(p_request_id uuid, p_new_status text, p_admin_notes text default null)
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

  return v_request;
end;
$$;
