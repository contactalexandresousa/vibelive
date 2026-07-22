-- "Sessões e Dispositivos" hoje só mostra HISTÓRICO de login (login_events,
-- fica pra sempre, não diz o que ainda está válido). Não existia nenhum jeito
-- de ver quais sessões estão ATIVAS agora nem encerrar uma específica — só
-- "sair de todas as outras" no atacado. auth.sessions (tabela real do
-- GoTrue) tem exatamente isso: testei ao vivo que apagar uma linha de lá
-- invalida a sessão na hora (token passa a responder 403), então dá pra
-- expor via SECURITY DEFINER sem precisar de Edge Function nem chamada
-- admin — só igualdade de user_id resolve o controle de acesso.
create function public.get_my_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_agent text,
  ip text,
  is_current boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  return query
    select s.id, s.created_at, s.updated_at, s.user_agent, s.ip::text,
      (s.id = (auth.jwt()->>'session_id')::uuid) as is_current
    from auth.sessions s
    where s.user_id = v_uid
    order by s.updated_at desc nulls last, s.created_at desc;
end;
$$;

create function public.revoke_my_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if p_session_id = (auth.jwt()->>'session_id')::uuid then
    raise exception 'Não é possível encerrar a sessão atual por aqui — use Sair.';
  end if;

  delete from auth.sessions where id = p_session_id and user_id = v_uid;
end;
$$;
