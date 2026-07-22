-- Mesmo bug de 0080 (get_moderation_blocks), pego de novo em teste real:
-- RETURNS TABLE(id uuid, ...) cria uma variável implícita "id" no escopo da
-- função inteira — "where id = auth.uid()" no check de admin ficou ambíguo
-- entre essa variável e profiles.id. Precisa qualificar.
create or replace function public.get_content_reports(p_limit int default 50)
returns table (
  id uuid,
  reporter_username text,
  reason text,
  created_at timestamptz,
  content_type text,
  post_id uuid,
  post_caption text,
  post_media_url text,
  post_author_username text,
  comment_id uuid,
  comment_text text,
  comment_author_username text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where profiles.id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem ver isso.';
  end if;

  return query
    select
      cr.id,
      rp.username,
      cr.reason,
      cr.created_at,
      case when cr.post_id is not null then 'post' else 'comment' end,
      p.id,
      p.caption,
      coalesce(p.media_url, p.media_urls[1]),
      pa.username,
      c.id,
      c.text,
      ca.username
    from public.content_reports cr
    join public.profiles rp on rp.id = cr.reporter_id
    left join public.posts p on p.id = cr.post_id
    left join public.profiles pa on pa.id = p.user_id
    left join public.post_comments c on c.id = cr.comment_id
    left join public.profiles ca on ca.id = c.user_id
    order by cr.created_at desc
    limit p_limit;
end;
$$;
