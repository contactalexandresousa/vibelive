-- Bug real, pego em teste: wallet_transactions.type tem uma constraint de
-- valores permitidos, e os dois tipos novos de 0086/0087
-- (admin_adjustment, withdrawal_cancelled) nunca foram adicionados a ela —
-- as duas funções quebravam com "violates check constraint" no primeiro
-- uso real, mesmo com toda a lógica de permissão/saldo correta.
alter table public.wallet_transactions drop constraint wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in (
    'gift', 'gift_received', 'quick_rose', 'quick_rose_received', 'pk_support',
    'vip_purchase', 'roulette_spin', 'daily_checkin', 'pix_recharge',
    'private_content_unlock', 'private_content_sale', 'withdrawal_request',
    'withdrawal_refund', 'subscription_charge', 'subscription_income',
    'referral_bonus', 'card_recharge', 'admin_adjustment', 'withdrawal_cancelled'
  ));
