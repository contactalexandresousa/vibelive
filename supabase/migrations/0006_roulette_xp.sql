-- spin_roulette() no protótipo original também concedia +30 XP por giro (app.js),
-- detalhe que passou despercebido na migration 0002. Substitui a função com o ajuste.
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
  select p into v_profile from public.profiles p where p.id = v_uid;
  return jsonb_build_object('profile', to_jsonb(v_profile), 'prize', v_prize);
end;
$$;
