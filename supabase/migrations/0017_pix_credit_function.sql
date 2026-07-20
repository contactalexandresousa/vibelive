-- Credita moedas a partir de um pagamento PIX confirmado. Só a Edge Function
-- do webhook (rodando com a service role key, um segredo que nunca fica no
-- cliente) pode chamar isso — por isso NÃO usa auth.uid() como em _credit_coins,
-- e por isso a revogação explícita abaixo é crítica: toda função nova no schema
-- public fica executável por "anon"/"authenticated" por padrão no Postgres, e
-- esta função aceita o valor em moedas como parâmetro direto (sem validar
-- contra um catálogo interno), o que a tornaria uma mina de moedas infinitas
-- se ficasse chamável pelo cliente.
create function public.credit_coins_from_pix(p_user_id uuid, p_amount int, p_pix_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set coins = coins + p_amount where id = p_user_id;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (p_user_id, p_amount, 'pix_recharge', jsonb_build_object('pix_payment_id', p_pix_payment_id));
end;
$$;

revoke all on function public.credit_coins_from_pix(uuid, int, uuid) from public, anon, authenticated;
grant execute on function public.credit_coins_from_pix(uuid, int, uuid) to service_role;
