-- Bug real, encontrado testando o item anterior (0069): RAISE EXCEPTION
-- desfaz TUDO na transação atual, inclusive o INSERT em rate_limit_blocks
-- feito um instante antes de levantar a exceção — o log do bloqueio nunca
-- sobrevivia, ficava sempre em zero. pg_net.http_post roda fora da
-- transação (mesmo motivo de _send_push funcionar), então sobrevive ao
-- rollback — troca o INSERT direto por essa chamada assíncrona.
create or replace function public._check_and_log_rate_limit(p_action text, p_max_count int, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select count(*) into v_count from public.rate_limit_events
    where user_id = v_uid and action = p_action and created_at > now() - p_window;

  if v_count >= p_max_count then
    perform net.http_post(
      url := 'https://mydudottsuvizwurrddz.supabase.co/functions/v1/log-rate-limit-block',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('user_id', v_uid, 'action', p_action)
    );
    raise exception 'Muitas ações em pouco tempo. Aguarde um pouco antes de tentar de novo.';
  end if;

  insert into public.rate_limit_events (user_id, action) values (v_uid, p_action);
end;
$$;
