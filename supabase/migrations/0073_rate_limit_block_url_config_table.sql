-- 0072 tentou resolver a URL por projeto via GUC (current_setting), mas
-- ALTER DATABASE ... SET app.settings.* dá "permission denied" no Postgres
-- gerenciado do Supabase (role não é superuser). Troca por uma tabelinha de
-- config normal — sem privilégio especial nenhum pra ler/escrever — que
-- cada projeto (produção/staging) recebe com o próprio valor depois que a
-- migração roda (o INSERT abaixo é só o seed padrão/produção; staging
-- sobrescreve manualmente com sua própria URL).
create table if not exists public._app_config (
  key text primary key,
  value text not null
);
alter table public._app_config enable row level security;
-- sem policies: só acessível via função SECURITY DEFINER, mesmo padrão de
-- rate_limit_events/rate_limit_blocks.

insert into public._app_config (key, value)
  values ('supabase_url', 'https://mydudottsuvizwurrddz.supabase.co')
  on conflict (key) do nothing;

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
    (select value from public._app_config where key = 'supabase_url'),
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
