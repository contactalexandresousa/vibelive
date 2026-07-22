-- Comentário em post era sempre uma lista plana — não dava pra responder um
-- comentário específico, só comentar de novo solto sem nenhuma ligação
-- visível. parent_id (uma camada só, como Instagram — resposta a resposta
-- não é permitida) resolve isso sem precisar de uma tabela nova.
alter table public.post_comments add column parent_id uuid references public.post_comments(id) on delete cascade;

create or replace function public.add_post_comment(p_post_id uuid, p_text text, p_parent_id uuid default null)
returns public.post_comments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_comment public.post_comments;
  v_parent public.post_comments;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if trim(p_text) = '' then
    raise exception 'Comentário vazio';
  end if;

  if p_parent_id is not null then
    select * into v_parent from public.post_comments where id = p_parent_id and post_id = p_post_id;
    if v_parent is null then
      raise exception 'Comentário original não encontrado.';
    end if;
    if v_parent.parent_id is not null then
      raise exception 'Não é possível responder a uma resposta.';
    end if;
  end if;

  insert into public.post_comments (post_id, user_id, text, parent_id)
    values (p_post_id, v_uid, p_text, p_parent_id)
    returning * into v_comment;

  perform public._apply_xp(v_uid, 15);

  return v_comment;
end;
$$;

-- Além de notificar o dono do post (comportamento já existente), uma
-- resposta também notifica o autor do comentário original — pode ser uma
-- pessoa diferente do dono do post. Reaproveita o mesmo tipo 'post_comment'
-- (é semanticamente o mesmo evento: alguém comentou), só muda quem recebe.
create or replace function public._notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post_owner uuid;
  v_parent_author uuid;
begin
  select user_id into v_post_owner from public.posts where id = new.post_id;
  if v_post_owner is not null and v_post_owner <> new.user_id then
    insert into public.notifications (user_id, type, actor_id, metadata)
    values (v_post_owner, 'post_comment', new.user_id, jsonb_build_object('post_id', new.post_id, 'text', left(new.text, 140)));
  end if;

  if new.parent_id is not null then
    select user_id into v_parent_author from public.post_comments where id = new.parent_id;
    if v_parent_author is not null and v_parent_author <> new.user_id and v_parent_author <> v_post_owner then
      insert into public.notifications (user_id, type, actor_id, metadata)
      values (v_parent_author, 'post_comment', new.user_id, jsonb_build_object('post_id', new.post_id, 'text', left(new.text, 140)));
    end if;
  end if;

  return new;
end;
$$;
