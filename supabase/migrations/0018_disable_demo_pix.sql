-- Agora que existe pagamento PIX real (create-pix-payment + mp-webhook),
-- deixar redeem_demo_pix chamável pelo cliente vira uma porta dos fundos:
-- qualquer pessoa poderia chamar sb.rpc('redeem_demo_pix', {p_package_code:'p1200'})
-- direto no devtools e ganhar 1200 moedas de graça, sem pagar nada — o mesmo
-- tipo de furo que a migration 0001 já fechou para colunas da carteira.
revoke execute on function public.redeem_demo_pix(text) from authenticated, anon;
-- NOTA: este revoke ficou incompleto — ver migration 0019, que revoga
-- também de PUBLIC (o grant que realmente importava).
