-- Bug real, confirmado por teste direto: a função do trigger estava marcada
-- SECURITY DEFINER, o que faz current_user dentro dela sempre resolver para o DONO
-- da função (postgres) — nunca para quem de fato disparou o UPDATE. Isso fazia a
-- condição "current_user not in ('postgres', ...)" ser sempre falsa, e a proteção
-- nunca entrava em ação. Funções de trigger devem rodar como SECURITY INVOKER
-- (padrão) justamente para poder inspecionar o current_user real do chamador.
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
  end if;
  return new;
end;
$$;
