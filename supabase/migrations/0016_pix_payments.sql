-- Pagamento PIX real: cada intenção de pagamento vira uma linha aqui. O saldo só
-- é creditado quando o webhook do Mercado Pago confirma pagamento aprovado
-- (nunca a partir do que o cliente diz) — mesmo princípio de "servidor decide
-- o valor e o estado" usado em toda a carteira (0002).
create table public.pix_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mp_payment_id text unique, -- id do pagamento no Mercado Pago, preenchido após criar a cobrança
  package_code text not null check (package_code in ('p50', 'p150', 'p500', 'p1200')),
  coins_amount int not null,
  brl_amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  qr_code text, -- copia-e-cola
  qr_code_base64 text, -- imagem do QR em base64
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pix_payments_user_idx on public.pix_payments (user_id, created_at desc);

alter table public.pix_payments enable row level security;

-- Cliente só lê os próprios pagamentos (pra acompanhar status em tempo real). Nenhum
-- insert/update direto: só a Edge Function (service role, bypassa RLS) escreve aqui.
create policy "users read own pix payments"
  on public.pix_payments for select
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.pix_payments;
