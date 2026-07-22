-- Bug real relatado pelo usuário: dava pra resgatar o check-in diário várias
-- vezes seguidas (bastava atualizar a página e clicar de novo) porque
-- claim_daily_checkin() nunca tinha nenhuma trava de tempo entre resgates —
-- decisão original de 0003 era deixar o ciclo de 7 dias visível numa sessão
-- só, o que fazia sentido pra um protótipo sem usuário real, mas virou um
-- jeito de graça de inflar moedas agora que o app está em produção de
-- verdade. 20h (em vez de 24h cravadas) dá uma folga pra quem faz o
-- check-in um pouco mais cedo a cada dia sem perder a sequência.
alter table public.daily_checkin_state add column last_claimed_at timestamptz;

create or replace function public.claim_daily_checkin()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_next_day int;
  v_last_claimed_at timestamptz;
  v_reward int;
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  insert into public.daily_checkin_state (user_id) values (v_uid)
    on conflict (user_id) do nothing;

  select next_day, last_claimed_at into v_next_day, v_last_claimed_at
    from public.daily_checkin_state where user_id = v_uid for update;

  if v_next_day > 7 then
    raise exception 'Você já completou todo o calendário semanal';
  end if;

  if v_last_claimed_at is not null and v_last_claimed_at > now() - interval '20 hours' then
    raise exception 'Você já fez o check-in de hoje. Volte mais tarde para continuar a sequência.';
  end if;

  v_reward := case when v_next_day = 7 then 50 else v_next_day * 5 end;

  perform public._credit_coins(v_reward, 'daily_checkin', jsonb_build_object('day', v_next_day));
  perform public._apply_xp(v_uid, 100);

  if v_next_day = 7 then
    update public.profiles set is_vip = true where id = v_uid;
  end if;

  update public.daily_checkin_state set next_day = v_next_day + 1, last_claimed_at = now() where user_id = v_uid;

  select * into v_profile from public.profiles where id = v_uid;
  return jsonb_build_object('profile', to_jsonb(v_profile), 'day', v_next_day, 'reward', v_reward);
end;
$$;
