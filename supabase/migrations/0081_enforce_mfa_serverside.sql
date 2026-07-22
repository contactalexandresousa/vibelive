-- Até aqui, 2FA só bloqueava pela tela: sb.auth.signInWithPassword() já
-- devolve uma sessão totalmente válida em AAL1 mesmo quando a conta tem TOTP
-- ativo — nenhuma policy/RPC checava auth.jwt()->>'aal', então quem tivesse
-- só a senha (sem o segundo fator) podia chamar a API direto e ignorar o
-- desafio inteiro. Fecha essa brecha nos pontos que realmente importam:
-- gasto de moedas, saque, troca de CPF (destino do saque) e geração de
-- códigos de backup — não em toda tabela do banco, porque a maior parte do
-- app (ver feed, perfil etc.) não é um alvo de conta comprometida.
--
-- Testado ao vivo antes de escrever isso: auth.jwt()->>'aal' e
-- ->>'session_id' funcionam corretamente em RPC autenticada, e o token já
-- vem com aal2 na PRÓXIMA chamada logo depois de mfaChallengeAndVerify —
-- sem corrida, sem esperar refresh.

-- Sessão que passou pelo desafio via código de BACKUP (não é um desafio TOTP
-- de verdade no GoTrue, então o token continua aal1) — registra aqui pra
-- _is_mfa_satisfied() reconhecer como segundo fator válido daquela sessão.
create table public.mfa_backup_code_sessions (
  session_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.mfa_backup_code_sessions enable row level security;
-- sem policy: só as funções SECURITY DEFINER abaixo leem/escrevem aqui.

-- Uso interno (chamada por outras funções, nunca direto do cliente): true se
-- a sessão atual já satisfaz "segundo fator", considerando três casos —
-- conta sem 2FA ativo (nada a exigir), aal2 de verdade (TOTP confirmado), ou
-- essa mesma sessão já validou um código de backup.
create function public._is_mfa_satisfied()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_has_mfa boolean;
begin
  if v_uid is null then
    return false;
  end if;

  select exists(
    select 1 from auth.mfa_factors where user_id = v_uid and factor_type = 'totp' and status = 'verified'
  ) into v_has_mfa;

  if not v_has_mfa then
    return true;
  end if;

  if (auth.jwt()->>'aal') = 'aal2' then
    return true;
  end if;

  return exists(
    select 1 from public.mfa_backup_code_sessions
    where session_id = (auth.jwt()->>'session_id')::uuid and user_id = v_uid
  );
end;
$$;

-- _spend_coins é o ponto único por onde passa TODO gasto de moeda do app
-- (presente, rosa, VIP, roleta, assinatura, conteúdo privado) — gatear aqui
-- cobre as seis RPCs de uma vez, sem duplicar a checagem em cada uma.
create or replace function public._spend_coins(p_amount integer, p_type text, p_metadata jsonb DEFAULT '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_coins int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if not public._is_mfa_satisfied() then
    raise exception 'Confirme sua autenticação em duas etapas antes de continuar.';
  end if;

  select coins into v_coins from public.profiles where id = v_uid for update;
  if v_coins < p_amount then
    raise exception 'Saldo de moedas insuficiente';
  end if;

  update public.profiles set coins = coins - p_amount where id = v_uid;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (v_uid, -p_amount, p_type, p_metadata);
end;
$$;

-- Saque não passa por _spend_coins (débito é feito direto, junto com o
-- registro do pedido) — precisa do próprio guard.
create or replace function public.request_withdrawal(p_coins integer, p_pix_key text, p_pix_key_type text)
returns withdrawal_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_min_coins constant int := 500;
  v_rate_cents constant int := 3;
  v_uid uuid := auth.uid();
  v_coins int;
  v_cpf text;
  v_pix_digits text;
  v_request public.withdrawal_requests;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if not public._is_mfa_satisfied() then
    raise exception 'Confirme sua autenticação em duas etapas antes de continuar.';
  end if;
  if p_coins is null or p_coins < v_min_coins then
    raise exception 'O saque mínimo é de % moedas.', v_min_coins;
  end if;
  if p_pix_key_type not in ('cpf', 'email', 'phone', 'random') then
    raise exception 'Tipo de chave PIX inválido.';
  end if;
  if p_pix_key is null or length(trim(p_pix_key)) = 0 then
    raise exception 'Informe uma chave PIX válida.';
  end if;

  select cpf into v_cpf from public.user_identity where user_id = v_uid;
  if v_cpf is null then
    raise exception 'Cadastre e confirme seu CPF nas configurações de perfil antes de solicitar um saque.';
  end if;

  if p_pix_key_type = 'cpf' then
    v_pix_digits := regexp_replace(p_pix_key, '[^0-9]', '', 'g');
    if v_pix_digits <> v_cpf then
      raise exception 'A chave PIX do tipo CPF precisa ser o seu próprio CPF cadastrado.';
    end if;
  end if;

  select coins into v_coins from public.profiles where id = v_uid for update;
  if v_coins < p_coins then
    raise exception 'Saldo de moedas insuficiente.';
  end if;

  update public.profiles set coins = coins - p_coins where id = v_uid;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (v_uid, -p_coins, 'withdrawal_request', jsonb_build_object('pix_key_type', p_pix_key_type));

  insert into public.withdrawal_requests (user_id, coins_amount, amount_brl_cents, pix_key, pix_key_type)
    values (v_uid, p_coins, p_coins * v_rate_cents, trim(p_pix_key), p_pix_key_type)
    returning * into v_request;

  return v_request;
end;
$$;

-- CPF define o destino de futuros saques — trocar sem o segundo fator seria
-- o primeiro passo pra desviar um saque pra chave PIX de outra pessoa.
create or replace function public.set_my_cpf(p_cpf text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_digits text;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if not public._is_mfa_satisfied() then
    raise exception 'Confirme sua autenticação em duas etapas antes de continuar.';
  end if;
  v_digits := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  if not public._is_valid_cpf(v_digits) then
    raise exception 'CPF inválido. Confira os números digitados.';
  end if;

  insert into public.user_identity (user_id, cpf, updated_at)
  values (v_uid, v_digits, now())
  on conflict (user_id) do update set cpf = excluded.cpf, updated_at = now();

  return v_digits;
end;
$$;

-- Aqui a checagem é DIFERENTE de propósito: exige aal2 de verdade (não
-- aceita uma sessão só com código de backup) — senão alguém com a senha
-- chamaria isso direto pra se auto-emitir códigos de backup válidos e usar
-- um deles pra "satisfazer" _is_mfa_satisfied(), driblando o 2FA inteiro.
create or replace function public.generate_my_backup_codes()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_has_factor boolean;
  v_codes text[] := '{}';
  v_code text;
  v_raw text;
  i int;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select exists(
    select 1 from auth.mfa_factors where user_id = v_uid and factor_type = 'totp' and status = 'verified'
  ) into v_has_factor;
  if not v_has_factor then
    raise exception 'Ative a autenticação em duas etapas antes de gerar códigos de backup.';
  end if;
  if coalesce(auth.jwt()->>'aal', 'aal1') <> 'aal2' then
    raise exception 'Confirme o código do seu app autenticador antes de gerar códigos de backup.';
  end if;

  delete from public.mfa_backup_codes where user_id = v_uid;

  for i in 1..10 loop
    v_raw := upper(encode(extensions.gen_random_bytes(4), 'hex'));
    v_code := substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4);
    v_codes := array_append(v_codes, v_code);
    insert into public.mfa_backup_codes (user_id, code_hash)
      values (v_uid, encode(extensions.digest(v_code, 'sha256'), 'hex'));
  end loop;

  return v_codes;
end;
$$;

-- Ao validar um código de backup com sucesso, registra a sessão atual como
-- "segundo fator satisfeito" pra _is_mfa_satisfied() reconhecer daqui pra
-- frente (senão logar com backup code nunca deixaria fazer nada sensível
-- depois, mesmo tendo provado posse de um fator legítimo).
create or replace function public.verify_my_backup_code(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_match_id bigint;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  perform public._check_and_log_rate_limit('verify_backup_code', 5, interval '15 minutes');

  v_hash := encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex');

  select id into v_match_id from public.mfa_backup_codes
    where user_id = v_uid and code_hash = v_hash and used_at is null
    limit 1;

  if v_match_id is null then
    raise exception 'Código de backup inválido ou já usado.';
  end if;

  update public.mfa_backup_codes set used_at = now() where id = v_match_id;

  insert into public.mfa_backup_code_sessions (session_id, user_id)
    values ((auth.jwt()->>'session_id')::uuid, v_uid)
    on conflict (session_id) do nothing;
end;
$$;
