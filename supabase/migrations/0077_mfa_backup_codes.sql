-- Quem ativa 2FA e perde o celular (ou desinstala o autenticador) hoje fica
-- sem nenhum jeito de entrar de novo — só o pedido de suspensão/appeal
-- existente serviria, e nem foi feito pra isso. Códigos de backup de uso
-- único resolvem, mesmo padrão de qualquer provedor grande (GitHub, Google).
-- Guarda só o hash (sha256 via pgcrypto) — o texto puro só existe no
-- instante da geração, devolvido uma vez só pro cliente mostrar/copiar.
create table public.mfa_backup_codes (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index mfa_backup_codes_user_idx on public.mfa_backup_codes (user_id);

alter table public.mfa_backup_codes enable row level security;
-- sem policy: só as funções SECURITY DEFINER abaixo leem/escrevem aqui.

-- Chamada logo depois de confirmar o enrollment do TOTP. Gera 10 códigos
-- novos e apaga quaisquer códigos antigos (regenerar invalida os anteriores
-- — mesmo comportamento de "gerar novos códigos" nos provedores grandes).
create function public.generate_my_backup_codes()
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

-- Chamada no desafio de login como alternativa ao código TOTP. Funciona em
-- AAL1 (o password já foi validado nesse ponto) — mesmo nível de proteção
-- que o desafio TOTP normal já opera hoje neste app.
create function public.verify_my_backup_code(p_code text)
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
end;
$$;

-- Chamada ao desativar 2FA — códigos de uma conta sem 2FA não servem pra
-- nada e não deveriam continuar armazenados (nem que só como hash).
create function public.clear_my_backup_codes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  delete from public.mfa_backup_codes where user_id = auth.uid();
end;
$$;
