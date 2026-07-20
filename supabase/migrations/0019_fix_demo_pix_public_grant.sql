-- A migration 0018 revogou execute de redeem_demo_pix só para "authenticated,
-- anon" e continuou explorável: toda função nova recebe EXECUTE por padrão
-- para o pseudo-role PUBLIC (todo mundo), separado dos grants por role
-- específico. Sem revogar de PUBLIC também, a chamada continuava funcionando
-- e creditando moedas de graça (confirmado testando ao vivo: 99 -> 1299
-- moedas via sb.rpc direto, mesmo após 0018). Mesmo cuidado já tomado em
-- credit_coins_from_pix (0017), que revogou de PUBLIC desde o início.
revoke execute on function public.redeem_demo_pix(text) from public, authenticated, anon;
