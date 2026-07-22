-- Story some depois de 24h (0092) sem opção de manter nenhum. "Destaque" fixa
-- um story escolhido permanentemente no perfil — mesma linha da tabela
-- stories, só marcada; não duplica dado nem precisa de tabela nova.
alter table public.stories add column is_highlighted boolean not null default false;

-- A policy original só deixava ver story com expires_at > now(). Destaque
-- precisa continuar visível depois de expirar — senão o story sumiria da
-- própria seção de destaques do dono minutos depois de virar destaque.
alter policy "stories visible to self and followers"
  on public.stories
  using (
    (expires_at > now() or is_highlighted)
    and (
      auth.uid() = user_id
      or exists (
        select 1 from public.follows f
        join public.profiles p on p.username = f.followed_handle
        where f.follower_id = auth.uid() and p.id = stories.user_id
      )
    )
  );

-- Só o dono destaca/remove destaque do próprio story.
create function public.toggle_story_highlight(p_story_id uuid, p_highlighted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  update public.stories
    set is_highlighted = p_highlighted
    where id = p_story_id and user_id = auth.uid();

  if not found then
    raise exception 'Story não encontrado.';
  end if;
end;
$$;

-- Mesma checagem de "sou eu ou sigo" de get_user_stories (0092), mas sem o
-- filtro de expires_at — é exatamente esse o ponto do destaque.
create function public.get_user_highlights(p_user_id uuid)
returns setof public.stories
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_can_view boolean;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  if v_uid = p_user_id then
    v_can_view := true;
  else
    select exists(
      select 1 from public.follows f
      join public.profiles p on p.username = f.followed_handle
      where f.follower_id = v_uid and p.id = p_user_id
    ) into v_can_view;
  end if;

  if not v_can_view then
    raise exception 'Você não pode ver os destaques dessa conta.';
  end if;

  return query
    select * from public.stories
    where user_id = p_user_id and is_highlighted = true
    order by created_at asc;
end;
$$;
