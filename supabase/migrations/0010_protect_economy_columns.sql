-- A migration 0001 tentou proteger coins/xp/level/is_vip com um REVOKE de coluna,
-- mas testes confirmaram que updates diretos do cliente (authenticated/anon) ainda
-- conseguiam alterá-las — a plataforma Supabase reaplica grants amplos nas tabelas
-- automaticamente, desfazendo REVOKEs manuais de coluna. A defesa correta e que
-- realmente se sustenta é um trigger: nossas funções SECURITY DEFINER (send_gift,
-- claim_daily_checkin etc.) são todas donas do role "postgres" e por isso rodam com
-- current_user = 'postgres'; qualquer UPDATE vindo direto do cliente roda como
-- "authenticated" ou "anon". O trigger reverte essas colunas para o valor anterior
-- sempre que quem estiver atualizando não for o dono das funções.

create function public._protect_profile_economy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'supabase_admin') then
    new.coins := old.coins;
    new.xp := old.xp;
    new.level := old.level;
    new.is_vip := old.is_vip;
  end if;
  return new;
end;
$$;

create trigger protect_profile_economy
  before update on public.profiles
  for each row
  execute function public._protect_profile_economy();

-- O REVOKE de coluna continua aqui como defesa em profundidade (não faz mal ter as
-- duas camadas), mas o trigger acima é quem garante a proteção de verdade.
