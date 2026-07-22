-- A URL do log-rate-limit-block em 0071 estava fixa na URL de PRODUÇÃO.
-- Como essa mesma migração roda tanto em produção quanto em staging (mesmo
-- arquivo SQL, dois projetos), isso faz qualquer bloqueio de rate limit
-- disparado em STAGING (inclusive pelos testes automatizados) gravar uma
-- linha em rate_limit_blocks de PRODUÇÃO — rate_limit_blocks não tem FK em
-- user_id, então o insert não falha, só suja a métrica real do admin com
-- dado de teste. Troca a URL fixa por uma configuração por projeto (GUC),
-- com a URL de produção como fallback pra não quebrar nada antes dela ser
-- configurada em cada projeto via ALTER DATABASE ... SET.
create or replace function public._check_and_log_rate_limit(p_action text, p_max_count int, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
  v_base_url text := coalesce(
    current_setting('app.settings.supabase_url', true),
    'https://mydudottsuvizwurrddz.supabase.co'
  );
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select count(*) into v_count from public.rate_limit_events
    where user_id = v_uid and action = p_action and created_at > now() - p_window;

  if v_count >= p_max_count then
    begin
      perform extensions.http_post(
        v_base_url || '/functions/v1/log-rate-limit-block',
        jsonb_build_object('user_id', v_uid, 'action', p_action)::text,
        'application/json'
      );
    exception when others then
      null;
    end;
    raise exception 'Muitas ações em pouco tempo. Aguarde um pouco antes de tentar de novo.';
  end if;

  insert into public.rate_limit_events (user_id, action) values (v_uid, p_action);
end;
$$;
