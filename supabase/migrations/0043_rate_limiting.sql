-- Nada até aqui impedia flood: denunciar a mesma pessoa em loop, spammar DM,
-- ou martelar presente/rosa via chamada direta à API (sem passar pelo botão
-- do app). Login/cadastro já tem limite real do próprio Supabase Auth
-- (over_email_send_rate_limit etc.) — não faz sentido reimplementar isso no
-- cliente, seria só teatro de segurança fácil de contornar. O que dá pra
-- reforçar de verdade no servidor é limite por ação dentro do próprio banco.
--
-- Tabela só de uso interno (nenhuma policy de RLS pra client) — só funções
-- SECURITY DEFINER leem/escrevem aqui, igual live_session_passwords (0031).
create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup_idx on public.rate_limit_events (user_id, action, created_at);
alter table public.rate_limit_events enable row level security;

-- Sem TTL automático: linhas antigas só importam pra contagem dentro da
-- janela de tempo de cada chamada (created_at > now() - p_window), então uma
-- tabela crescendo sem limpeza não afeta a correção — só o tamanho em disco
-- a longo prazo, aceitável pro estágio atual do projeto.
create function public._check_and_log_rate_limit(p_action text, p_max_count int, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select count(*) into v_count from public.rate_limit_events
    where user_id = v_uid and action = p_action and created_at > now() - p_window;

  if v_count >= p_max_count then
    raise exception 'Muitas ações em pouco tempo. Aguarde um pouco antes de tentar de novo.';
  end if;

  insert into public.rate_limit_events (user_id, action) values (v_uid, p_action);
end;
$$;

-- Denúncia: até 5 por hora — trava spam contra uma pessoa específica E
-- flood da fila de moderação em geral (o limite conta todas as denúncias
-- da conta, não só contra o mesmo alvo).
create function public._enforce_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._check_and_log_rate_limit('report_user', 5, interval '1 hour');
  return new;
end;
$$;

create trigger trg_rate_limit_reports
  before insert on public.user_reports
  for each row execute function public._enforce_report_rate_limit();

-- Mensagem direta: até 30 por minuto — generoso pro ritmo normal de
-- conversa, mas barra script de flood.
create function public._enforce_dm_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._check_and_log_rate_limit('direct_message', 30, interval '1 minute');
  return new;
end;
$$;

create trigger trg_rate_limit_direct_messages
  before insert on public.direct_messages
  for each row execute function public._enforce_dm_rate_limit();

-- Presentes/rosa: manda através de RPC (não INSERT direto), então o limite
-- entra na própria função. Rosa tem limite mais alto de propósito — é
-- literalmente feita pra ser tocada em sequência durante um momento
-- empolgante da live.
create or replace function public.send_gift(p_gift_code text, p_broadcaster_handle text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price int;
  v_uid uuid := auth.uid();
  v_gift_label text;
  v_username text;
  v_broadcaster_id uuid;
begin
  perform public._check_and_log_rate_limit('send_gift', 30, interval '1 minute');

  v_price := case p_gift_code
    when 'rosa' then 1
    when 'chocolate' then 5
    when 'diamante' then 25
    when 'coroa_vip' then 100
    when 'super_carro' then 500
    when 'castelo' then 1000
    else null
  end;
  if v_price is null then
    raise exception 'Presente inválido';
  end if;

  v_gift_label := case p_gift_code
    when 'rosa' then 'Rosa 🌹'
    when 'chocolate' then 'Chocolate 🍫'
    when 'diamante' then 'Diamante 💎'
    when 'coroa_vip' then 'Coroa VIP 👑'
    when 'super_carro' then 'Super Carro 🚗'
    when 'castelo' then 'Castelo 🏰'
  end;

  perform public._spend_coins(v_price, 'gift', jsonb_build_object('gift_code', p_gift_code, 'broadcaster', p_broadcaster_handle));

  if p_broadcaster_handle is not null then
    select id into v_broadcaster_id from public.profiles where username = p_broadcaster_handle;
    if v_broadcaster_id is not null and v_broadcaster_id <> v_uid then
      perform public._credit_coins_to(v_broadcaster_id, v_price, 'gift_received', jsonb_build_object('gift_code', p_gift_code, 'from', v_uid));
    end if;

    select coalesce(display_name, username) into v_username from public.profiles where id = v_uid;
    insert into public.live_chat_messages (broadcaster_handle, user_id, username, text, type)
      values (p_broadcaster_handle, v_uid, v_username, 'enviou ' || v_gift_label, 'gift');
  end if;

  return (select p from public.profiles p where id = v_uid);
end;
$$;

create or replace function public.send_quick_rose(p_broadcaster_handle text default null)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_username text;
  v_broadcaster_id uuid;
begin
  perform public._check_and_log_rate_limit('send_quick_rose', 60, interval '1 minute');

  perform public._spend_coins(1, 'quick_rose');

  if p_broadcaster_handle is not null then
    select id into v_broadcaster_id from public.profiles where username = p_broadcaster_handle;
    if v_broadcaster_id is not null and v_broadcaster_id <> v_uid then
      perform public._credit_coins_to(v_broadcaster_id, 1, 'quick_rose_received', jsonb_build_object('from', v_uid));
    end if;

    select coalesce(display_name, username) into v_username from public.profiles where id = v_uid;
    insert into public.live_chat_messages (broadcaster_handle, user_id, username, text, type)
      values (p_broadcaster_handle, v_uid, v_username, 'enviou uma Rosa 🌹', 'gift');
  end if;

  return (select p from public.profiles p where id = v_uid);
end;
$$;
