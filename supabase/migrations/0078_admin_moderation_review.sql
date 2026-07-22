-- 0076 criou moderation_blocks e um contador no admin ("N imagens bloqueadas
-- hoje"), mas não dava pra ver QUEM foi bloqueado nem POR QUÊ — importante
-- assim que a Sightengine estiver com credenciais reais, pra pegar falso
-- positivo (ex: alguém sem conseguir postar uma foto totalmente normal).
create function public.get_moderation_blocks(p_limit int default 50)
returns table (
  id bigint,
  user_id uuid,
  username text,
  display_name text,
  context text,
  reason text,
  image_url text,
  created_at timestamptz
)
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
    raise exception 'Apenas administradores podem ver isso.';
  end if;

  return query
    select mb.id, mb.user_id, p.username, p.display_name, mb.context, mb.reason, mb.image_url, mb.created_at
    from public.moderation_blocks mb
    left join public.profiles p on p.id = mb.user_id
    order by mb.created_at desc
    limit p_limit;
end;
$$;
