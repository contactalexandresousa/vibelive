-- 0070 trocou o INSERT direto por net.http_post (pg_net) pensando que, por
-- ser "assíncrono", escaparia do ROLLBACK causado pelo RAISE EXCEPTION logo
-- em seguida. Testei ao vivo (DO block com net.http_post + raise exception)
-- e net.http_request_queue ficou vazia — pg_net só ENFILEIRA a chamada via
-- um INSERT comum numa tabela, e esse INSERT é parte da MESMA transação:
-- se ela não commita, a fila nunca existiu, o worker nunca viu nada. Ou
-- seja, pg_net tem exatamente o mesmo problema do INSERT direto (0069) —
-- só funciona pra side-effects em transações que de fato commitam (é
-- por isso que _send_push funciona: a transação dele sempre completa).
--
-- A extensão "http" (sync, via libcurl, chamada inline no processo do
-- Postgres) não depende de nenhuma tabela/fila commitada — a request HTTP
-- já foi enviada e respondida antes do RAISE EXCEPTION rodar, então
-- sobrevive ao rollback. Confirmado ao vivo com o mesmo teste (DO block +
-- rollback forçado): a linha em rate_limit_blocks ficou lá.
create extension if not exists http with schema extensions;

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
    begin
      perform extensions.http_post(
        'https://mydudottsuvizwurrddz.supabase.co/functions/v1/log-rate-limit-block',
        jsonb_build_object('user_id', v_uid, 'action', p_action)::text,
        'application/json'
      );
    exception when others then
      -- nunca deixa uma falha de rede no log esconder o bloqueio real do usuário
      null;
    end;
    raise exception 'Muitas ações em pouco tempo. Aguarde um pouco antes de tentar de novo.';
  end if;

  insert into public.rate_limit_events (user_id, action) values (v_uid, p_action);
end;
$$;
