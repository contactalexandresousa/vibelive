-- Não existe forma de descobrir conta nova além de buscar por nome exato —
-- quem chega sem seguir ninguém não tem por onde começar. Sugere contas que
-- a pessoa ainda não segue, ordenado por quantidade de seguidores (sem
-- coluna denormalizada — calcula na hora via subquery, aceitável no volume
-- atual do app).
create function public.get_suggested_profiles(p_limit int default 10)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  followers_count int
)
language plpgsql
stable
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
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.bio,
      (select count(*)::int from public.follows f2 where f2.followed_handle = p.username) as followers_count
    from public.profiles p
    where p.id <> v_uid
      and p.username is not null
      and coalesce(p.is_suspended, false) = false
      and not exists (
        select 1 from public.follows f
        where f.follower_id = v_uid and f.followed_handle = p.username
      )
      and not exists (
        select 1 from public.blocked_users b
        where (b.blocker_id = v_uid and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = v_uid)
      )
    order by followers_count desc, p.created_at desc
    limit p_limit;
end;
$$;
