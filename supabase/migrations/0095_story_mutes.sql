-- Hoje a única forma de parar de ver os stories de alguém que você segue é
-- bloquear a conta inteira (perde DM, perfil, tudo). Silenciar é bem mais
-- leve: só tira essa pessoa do carrossel de stories, sem mexer no resto.
create table public.story_mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_user_id)
);

alter table public.story_mutes enable row level security;

create policy "users manage own story mutes"
  on public.story_mutes for all
  using (auth.uid() = muter_id)
  with check (auth.uid() = muter_id);

create or replace function public.get_stories_feed()
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  latest_story_at timestamptz,
  story_count int,
  has_unseen boolean
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
    select p.id, p.username, p.display_name, p.avatar_url,
      max(s.created_at) as latest_story_at,
      count(s.id)::int as story_count,
      bool_or(sv.viewer_id is null) as has_unseen
    from public.stories s
    join public.profiles p on p.id = s.user_id
    left join public.story_views sv on sv.story_id = s.id and sv.viewer_id = v_uid
    where s.expires_at > now()
      and (
        s.user_id = v_uid
        or exists (select 1 from public.follows f where f.follower_id = v_uid and f.followed_handle = p.username)
      )
      and not exists (select 1 from public.story_mutes m where m.muter_id = v_uid and m.muted_user_id = p.id)
    group by p.id, p.username, p.display_name, p.avatar_url
    order by (p.id = v_uid) desc, has_unseen desc, latest_story_at desc;
end;
$$;

create function public.toggle_story_mute(p_user_id uuid, p_muted boolean)
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
  if v_uid = p_user_id then
    raise exception 'Não é possível silenciar os próprios stories.';
  end if;

  if p_muted then
    insert into public.story_mutes (muter_id, muted_user_id) values (v_uid, p_user_id)
      on conflict (muter_id, muted_user_id) do nothing;
  else
    delete from public.story_mutes where muter_id = v_uid and muted_user_id = p_user_id;
  end if;
end;
$$;

create function public.get_my_story_mutes()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select muted_user_id from public.story_mutes where muter_id = auth.uid();
$$;
