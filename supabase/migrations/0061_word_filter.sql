-- Moderação hoje é 100% reativa (só age depois de alguém denunciar). Um
-- filtro simples de termos bloqueados no chat ao vivo e em legendas de posts
-- adiciona uma camada proativa — não substitui denúncia/revisão humana, só
-- reduz a exposição de ofensas óbvias antes de alguém precisar reportar.
-- Lista curada pelo admin (RPCs abaixo), não hardcoded: começa vazia de
-- propósito — curar uma lista de termos ofensivos é trabalho editorial
-- contínuo do admin, não algo pra travar num valor fixo no código.
create table public.banned_words (
  word text primary key,
  created_at timestamptz not null default now()
);

alter table public.banned_words enable row level security;

create policy "admins read banned words"
  on public.banned_words for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Censura (troca por asteriscos do mesmo tamanho), não bloqueia o envio —
-- rejeitar a mensagem inteira por causa de uma palavra é mais disruptivo do
-- que necessário, e a pessoa nem fica sabendo o que ativou o filtro.
create function public._censor_text(p_text text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result text := p_text;
  v_word record;
begin
  for v_word in select word from public.banned_words loop
    v_result := regexp_replace(v_result, '(?i)\y' || v_word.word || '\y', repeat('*', length(v_word.word)), 'g');
  end loop;
  return v_result;
end;
$$;

create function public._censor_live_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type = 'chat' then
    new.text := public._censor_text(new.text);
  end if;
  return new;
end;
$$;

create trigger trg_censor_live_chat
  before insert on public.live_chat_messages
  for each row execute function public._censor_live_chat_message();

create function public._censor_post_caption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.caption is not null then
    new.caption := public._censor_text(new.caption);
  end if;
  return new;
end;
$$;

create trigger trg_censor_post_caption
  before insert or update on public.posts
  for each row execute function public._censor_post_caption();

create function public.admin_add_banned_word(p_word text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_word text;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem gerenciar a lista de palavras bloqueadas.';
  end if;

  v_word := lower(trim(p_word));
  if v_word = '' then
    raise exception 'Informe uma palavra.';
  end if;

  insert into public.banned_words (word) values (v_word) on conflict (word) do nothing;
  perform public._log_admin_action('add_banned_word', null, jsonb_build_object('word', v_word));
end;
$$;

create function public.admin_remove_banned_word(p_word text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem gerenciar a lista de palavras bloqueadas.';
  end if;

  delete from public.banned_words where word = lower(trim(p_word));
  perform public._log_admin_action('remove_banned_word', null, jsonb_build_object('word', lower(trim(p_word))));
end;
$$;
