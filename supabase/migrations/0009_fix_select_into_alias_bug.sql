-- Bug real e isolado por teste direto: com search_path='', a sintaxe
-- "select <alias> into <variavel composta> from tabela <alias>" seguida de
-- to_jsonb(<variavel>) quebra com "invalid input syntax for type uuid" —
-- Postgres tenta reinterpretar o literal de composto como texto de volta.
-- "select * into <variavel> from tabela where ..." (sem alias) não tem esse problema.
-- Afeta claim_daily_checkin (0007) e spin_roulette (0006), as duas únicas funções
-- que fazem SELECT INTO de uma variável public.profiles e depois to_jsonb() nela.

create or replace function public.claim_daily_checkin()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_next_day int;
  v_reward int;
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  insert into public.daily_checkin_state (user_id) values (v_uid)
    on conflict (user_id) do nothing;

  select next_day into v_next_day from public.daily_checkin_state where user_id = v_uid for update;

  if v_next_day > 7 then
    raise exception 'Você já completou todo o calendário semanal';
  end if;

  v_reward := case when v_next_day = 7 then 50 else v_next_day * 5 end;

  perform public._credit_coins(v_reward, 'daily_checkin', jsonb_build_object('day', v_next_day));
  perform public._apply_xp(v_uid, 100);

  if v_next_day = 7 then
    update public.profiles set is_vip = true where id = v_uid;
  end if;

  update public.daily_checkin_state set next_day = v_next_day + 1 where user_id = v_uid;

  select * into v_profile from public.profiles where id = v_uid;
  return jsonb_build_object('profile', to_jsonb(v_profile), 'day', v_next_day, 'reward', v_reward);
end;
$$;

create or replace function public.spin_roulette()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_prizes text[] := array['Super Beijo 💖', 'Abraço Virtual 🤗', 'Dueto VIP 👑', 'Parabéns Especial 🎉', 'Mentoria Exclusiva ⭐', 'Tente de Novo 🥱'];
  v_prize text;
  v_profile public.profiles;
begin
  perform public._spend_coins(10, 'roulette_spin');
  perform public._apply_xp(v_uid, 30);
  v_prize := v_prizes[1 + floor(random() * array_length(v_prizes, 1))::int];
  select * into v_profile from public.profiles where id = v_uid;
  return jsonb_build_object('profile', to_jsonb(v_profile), 'prize', v_prize);
end;
$$;
