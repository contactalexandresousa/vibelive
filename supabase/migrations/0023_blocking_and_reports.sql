-- Bloqueio e denúncia de usuários. Agora que pessoas reais podem se contatar
-- por DM e vídeo ao vivo (chat, live), não existir nenhuma forma de impedir
-- contato indesejado deixou de ser "recurso faltando" e virou lacuna de
-- segurança. O bloqueio é reforçado no servidor (trigger em direct_messages),
-- não só escondido na tela — impede envio de DM em qualquer direção entre
-- duas pessoas com bloqueio ativo, mesmo se alguém tentar inserir direto pela API.
create table public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocked_users enable row level security;

create policy "users manage their own blocks"
  on public.blocked_users for all
  using (auth.uid() = blocker_id)
  with check (auth.uid() = blocker_id);

create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);

alter table public.user_reports enable row level security;

-- Denúncia é permanente e imutável pelo denunciante (sem policy de
-- update/delete). Leitura de todas as denúncias (moderação) fica pra um
-- painel admin futuro via service role key — fora do escopo desta fase.
create policy "users create their own reports"
  on public.user_reports for insert
  with check (auth.uid() = reporter_id);

create policy "users view their own submitted reports"
  on public.user_reports for select
  using (auth.uid() = reporter_id);

-- A verificação precisa enxergar bloqueios feitos pela OUTRA pessoa (ex: o
-- destinatário bloqueou o remetente) — RLS normal só deixaria cada um ver os
-- próprios bloqueios, então a função roda como SECURITY DEFINER para
-- verificar as duas direções. Ela só barra ou libera o INSERT; não devolve
-- nenhuma linha de blocked_users pro cliente, então não vaza quem bloqueou quem.
create function public._enforce_dm_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.blocked_users
    where (blocker_id = new.sender_id and blocked_id = new.recipient_id)
       or (blocker_id = new.recipient_id and blocked_id = new.sender_id)
  ) then
    raise exception 'Não é possível enviar mensagem: bloqueio entre os usuários.';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_dm_block
  before insert on public.direct_messages
  for each row execute function public._enforce_dm_block();
