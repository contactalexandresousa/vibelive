-- Chamada de vídeo 1:1 nas mensagens diretas. O botão já existia na tela
-- (só mostrava "ainda não disponível") — agora usa a mesma infra de vídeo
-- real já validada na co-transmissão (0056): sinalização via tabela +
-- Realtime, permissão de publicar concedida pela Edge Function
-- create-livekit-token depois de conferir o status aqui.
create table public.call_invites (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  room_name text not null,
  status text not null default 'ringing' check (status in ('ringing', 'accepted', 'declined', 'ended', 'missed')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (caller_id <> callee_id)
);

create index call_invites_callee_idx on public.call_invites (callee_id, created_at desc);
create index call_invites_caller_idx on public.call_invites (caller_id, created_at desc);

alter table public.call_invites enable row level security;

create policy "participants read their own calls"
  on public.call_invites for select
  using (auth.uid() = caller_id or auth.uid() = callee_id);

create policy "caller starts a call"
  on public.call_invites for insert
  with check (auth.uid() = caller_id);

-- Callee aceita/recusa; qualquer um dos dois pode encerrar depois (mesma
-- policy cobre as duas transições — o corpo de cada UPDATE decide qual status).
create policy "participants update their own call"
  on public.call_invites for update
  using (auth.uid() = caller_id or auth.uid() = callee_id)
  with check (auth.uid() = caller_id or auth.uid() = callee_id);

alter publication supabase_realtime add table public.call_invites;

-- Mesma trava de bloqueio já aplicada em DM (_enforce_dm_block, 0023) — sem
-- isso, alguém bloqueado ainda conseguiria "ligar" pra quem o bloqueou.
create function public._enforce_call_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.blocked_users
    where (blocker_id = new.caller_id and blocked_id = new.callee_id)
       or (blocker_id = new.callee_id and blocked_id = new.caller_id)
  ) then
    raise exception 'Não é possível ligar: bloqueio entre os usuários.';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_call_block
  before insert on public.call_invites
  for each row execute function public._enforce_call_block();

-- Mesmo princípio de rate limit já usado em DM/denúncia/presente (0043) —
-- até 10 tentativas de chamada por minuto, generoso pro uso normal mas
-- trava discagem em loop.
create function public._enforce_call_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._check_and_log_rate_limit('call_invite', 10, interval '1 minute');
  return new;
end;
$$;

create trigger trg_rate_limit_call_invites
  before insert on public.call_invites
  for each row execute function public._enforce_call_rate_limit();
