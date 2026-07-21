-- Hoje um erro de JS na tela de um usuário real só chega até nós se ele
-- reportar manualmente. Captura global de erro no cliente (window.onerror +
-- unhandledrejection) manda pra cá; o admin ganha visibilidade real sem
-- depender de reclamação. Sem serviço externo (Sentry etc.) — fica tudo
-- dentro do mesmo projeto Supabase já usado por todo o resto do app.
create table public.client_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  message text not null check (char_length(message) <= 500),
  stack text check (stack is null or char_length(stack) <= 4000),
  url text check (url is null or char_length(url) <= 500),
  user_agent text check (user_agent is null or char_length(user_agent) <= 300),
  created_at timestamptz not null default now()
);

create index client_errors_created_idx on public.client_errors (created_at desc);

alter table public.client_errors enable row level security;

-- Precisa aceitar de visitante não logado também — a tela pode quebrar
-- antes de qualquer login acontecer.
create policy "anyone can log a client error"
  on public.client_errors for insert
  with check (true);

create policy "admins read client errors"
  on public.client_errors for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- user_id nunca vem do que o cliente mandou (fácil de forjar) — sempre o
-- auth.uid() real da sessão, nulo se for visitante.
create function public._set_client_error_user_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create trigger trg_set_client_error_user_id
  before insert on public.client_errors
  for each row execute function public._set_client_error_user_id();

-- Agrupado por mensagem (não uma linha por evento) — uma tela cheia de 500
-- linhas do mesmo erro repetido não ajuda ninguém a priorizar.
create function public.get_recent_client_errors(p_limit int default 50)
returns table (message text, occurrences bigint, last_seen timestamptz, sample_stack text, sample_url text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem ver os erros registrados.';
  end if;

  return query
    select
      ce.message,
      count(*)::bigint as occurrences,
      max(ce.created_at) as last_seen,
      (array_agg(ce.stack order by ce.created_at desc))[1] as sample_stack,
      (array_agg(ce.url order by ce.created_at desc))[1] as sample_url
    from public.client_errors ce
    where ce.created_at > now() - interval '7 days'
    group by ce.message
    order by last_seen desc
    limit p_limit;
end;
$$;
