-- Pagamento por cartão de crédito via Mercado Pago Checkout Pro. Mesma lógica
-- de confiança do PIX (0016/0017): o saldo só é creditado quando o webhook
-- confirma pagamento aprovado, nunca a partir do que o cliente diz. Tabela
-- separada de pix_payments porque os campos são diferentes (aqui não tem QR
-- code, tem preference_id/init_point do Checkout Pro) — mas o formato de
-- confiança e o fluxo de leitura via Realtime são idênticos.
create table public.card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mp_payment_id text unique, -- preenchido só depois que o Mercado Pago processa o cartão
  mp_preference_id text not null,
  package_code text not null check (package_code in ('p50', 'p150', 'p500', 'p1200')),
  coins_amount int not null,
  brl_amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  init_point text not null, -- URL do Checkout Pro pra onde o cliente abre em nova aba
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index card_payments_user_idx on public.card_payments (user_id, created_at desc);

alter table public.card_payments enable row level security;

create policy "users read own card payments"
  on public.card_payments for select
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.card_payments;

alter table public.wallet_transactions drop constraint wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in (
    'gift', 'gift_received', 'quick_rose', 'quick_rose_received',
    'pk_support', 'vip_purchase', 'roulette_spin', 'daily_checkin', 'pix_recharge',
    'private_content_unlock', 'private_content_sale',
    'withdrawal_request', 'withdrawal_refund',
    'subscription_charge', 'subscription_income',
    'referral_bonus', 'card_recharge'
  ));

-- Mesmo cuidado de grants da 0017/0019: revoga de PUBLIC também, não só de
-- authenticated/anon — toda função nova recebe EXECUTE de PUBLIC por padrão.
create function public.credit_coins_from_card(p_user_id uuid, p_amount int, p_card_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set coins = coins + p_amount where id = p_user_id;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (p_user_id, p_amount, 'card_recharge', jsonb_build_object('card_payment_id', p_card_payment_id));
end;
$$;

revoke all on function public.credit_coins_from_card(uuid, int, uuid) from public, anon, authenticated;
grant execute on function public.credit_coins_from_card(uuid, int, uuid) to service_role;
