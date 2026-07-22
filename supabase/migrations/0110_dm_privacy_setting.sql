-- Hoje qualquer conta pode iniciar uma DM com qualquer outra. dm_privacy
-- deixa restringir a "só quem eu sigo" — mesmo padrão de coluna pública em
-- profiles (leitura já é "profiles are publicly readable"; escrita usa a
-- policy de update do próprio perfil, 0001, sem precisar de RPC).
alter table public.profiles add column dm_privacy text not null default 'everyone'
  check (dm_privacy in ('everyone', 'followers_only'));

-- Reforça no servidor, não só escondido na tela — mesmo padrão de
-- _enforce_dm_block (0023). "followers_only" aqui significa: só quem o
-- DESTINATÁRIO segue pode mandar mensagem pra ele (não o contrário).
create function public._enforce_dm_privacy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_privacy text;
begin
  select dm_privacy into v_privacy from public.profiles where id = new.recipient_id;
  if coalesce(v_privacy, 'everyone') = 'followers_only' and new.sender_id <> new.recipient_id then
    if not exists (
      select 1 from public.follows f
      join public.profiles p on p.username = f.followed_handle
      where f.follower_id = new.recipient_id and p.id = new.sender_id
    ) then
      raise exception 'Essa pessoa só recebe mensagens de quem ela segue.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_dm_privacy
  before insert on public.direct_messages
  for each row execute function public._enforce_dm_privacy();
