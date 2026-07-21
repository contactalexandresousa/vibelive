-- Toda conta nova ganhava 99 moedas de bônus só por se cadastrar. Removido —
-- agora começa em 0; moedas só entram por check-in diário, roleta ou PIX real.
alter table public.profiles alter column coins set default 0;
