-- create or replace function com uma assinatura diferente (parâmetro novo) NÃO
-- substitui a função antiga — cria uma sobrecarga. A migration 0014 deixou duas
-- versões de support_pk coexistindo (support_pk(text) e support_pk(text, text)),
-- o que quebra o PostgREST: "Could not choose the best candidate function".
-- A migration 0012 cometeu o mesmo erro com send_quick_rose (ainda não tinha
-- disparado erro porque o único chamador sempre passa o parâmetro novo por
-- nome, mas uma chamada sem argumentos ficaria ambígua da mesma forma).
-- Remove as assinaturas antigas antes de recriar com os parâmetros novos.
drop function if exists public.support_pk(text);
drop function if exists public.send_quick_rose();

create or replace function public.support_pk(p_side text, p_battle_key text default 'moranguinho_vs_luana')
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cost int;
  v_points int;
  v_gift_label text;
  v_uid uuid := auth.uid();
  v_username text;
begin
  v_cost := case p_side when 'A' then 1 when 'B' then 25 else null end;
  if v_cost is null then
    raise exception 'Lado inválido';
  end if;
  v_points := case p_side when 'A' then 100 else 250 end;
  v_gift_label := case p_side when 'A' then 'Rosa 🌹' else 'Diamante 💎' end;

  perform public._spend_coins(v_cost, 'pk_support', jsonb_build_object('side', p_side));

  select coalesce(display_name, username) into v_username from public.profiles where id = v_uid;
  insert into public.pk_battle_events (battle_key, user_id, username, side, points, gift_label)
    values (p_battle_key, v_uid, v_username, p_side, v_points, v_gift_label);

  return (select p from public.profiles p where id = v_uid);
end;
$$;
