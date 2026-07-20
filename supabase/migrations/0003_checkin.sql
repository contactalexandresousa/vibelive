-- Check-in diário sequencial (sem trava por data de calendário — paridade com o comportamento
-- atual do protótipo: o objetivo é deixar o ciclo de 7 dias visível numa sessão só, não simular
-- uma semana real).
create table public.daily_checkin_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  next_day int not null default 1
);

alter table public.daily_checkin_state enable row level security;

create policy "users read own checkin state"
  on public.daily_checkin_state for select
  using (auth.uid() = user_id);
-- Sem policy de insert/update: só a função abaixo escreve.

create function public.claim_daily_checkin()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_next_day int;
  v_reward int;
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

  return (select p from public.profiles p where id = v_uid);
end;
$$;
