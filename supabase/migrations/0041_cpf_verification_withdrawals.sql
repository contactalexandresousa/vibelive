-- Hoje qualquer pedido de saque aceita qualquer chave PIX, mesmo que não
-- seja da pessoa dona da conta — numa conta comprometida isso é uma forma
-- direta de drenar saldo alheio pra fora. Exige CPF cadastrado (validado de
-- verdade, com dígito verificador, não só formato) antes de qualquer saque;
-- quando a chave usada é do tipo CPF, ela precisa bater com o CPF cadastrado.
-- Não valida chaves email/celular/aleatória contra o dono real porque isso
-- exigiria integração com uma API de consulta de titularidade Pix, fora do
-- escopo hoje — mas exigir o CPF confirmado na conta já é uma barreira real
-- contra uso indevido de conta invadida.

-- Tabela separada (não profiles): profiles tem policy de leitura pública
-- ("profiles are publicly readable") — CPF é dado sensível, nunca pode estar
-- numa tabela que qualquer usuário logado consegue ler.
create table public.user_identity (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  cpf text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_identity enable row level security;

create policy "users manage own identity"
  on public.user_identity for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create function public._is_valid_cpf(p_cpf text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_digits text;
  v_sum int;
  v_rest int;
  v_d1 int;
  v_d2 int;
  i int;
begin
  v_digits := regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g');
  if length(v_digits) <> 11 then
    return false;
  end if;
  -- Sequências como 111.111.111-11 passam no cálculo do dígito verificador
  -- mas nunca são CPFs reais emitidos.
  if v_digits ~ '^(\d)\1{10}$' then
    return false;
  end if;

  v_sum := 0;
  for i in 1..9 loop
    v_sum := v_sum + substr(v_digits, i, 1)::int * (11 - i);
  end loop;
  v_rest := v_sum % 11;
  v_d1 := case when v_rest < 2 then 0 else 11 - v_rest end;
  if v_d1 <> substr(v_digits, 10, 1)::int then
    return false;
  end if;

  v_sum := 0;
  for i in 1..10 loop
    v_sum := v_sum + substr(v_digits, i, 1)::int * (12 - i);
  end loop;
  v_rest := v_sum % 11;
  v_d2 := case when v_rest < 2 then 0 else 11 - v_rest end;
  if v_d2 <> substr(v_digits, 11, 1)::int then
    return false;
  end if;

  return true;
end;
$$;

create function public.set_my_cpf(p_cpf text)
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

create or replace function public.request_withdrawal(p_coins int, p_pix_key text, p_pix_key_type text)
returns public.withdrawal_requests
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
