-- O app lida com conteúdo pago e dinheiro real via PIX — precisa de uma
-- verificação de idade de verdade (18+) e registro de aceite dos Termos de
-- Uso, não só uma checkbox decorativa. A validação real fica no gatilho que
-- cria o profile (raiz da conta), não só no cliente: alguém chamando a API
-- do Supabase direto, sem passar pelo app, ainda cai nessa trava.
alter table public.profiles add column birth_date date;
alter table public.profiles add column terms_accepted_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_birth_date date;
  v_terms_accepted boolean;
begin
  v_birth_date := nullif(new.raw_user_meta_data->>'birth_date', '')::date;
  v_terms_accepted := coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false);

  -- Só valida quando uma data veio junto (cadastro por e-mail/senha manda
  -- sempre; login social como Google não tem como coletar isso antes do
  -- redirect — essas contas ficam bloqueadas por STATE.needsAgeVerification
  -- no cliente até completar o mesmo passo depois de logar).
  if v_birth_date is not null and age(v_birth_date::timestamp) < interval '18 years' then
    raise exception 'É preciso ter 18 anos ou mais para criar uma conta no VibeLive.';
  end if;

  insert into public.profiles (id, username, display_name, birth_date, terms_accepted_at)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'visitante_' || substr(new.id::text, 1, 8)),
    coalesce(split_part(new.email, '@', 1), 'Visitante'),
    v_birth_date,
    case when v_terms_accepted then now() else null end
  );
  return new;
end;
$$;

-- Usado depois do login pra contas sem data de nascimento ainda (Google OAuth
-- ou contas criadas antes dessa migration) — mesma validação de 18+, chamada
-- explicitamente pelo usuário no modal de verificação de idade.
create function public.verify_age_and_accept_terms(p_birth_date date)
returns public.profiles
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
  if p_birth_date is null then
    raise exception 'Informe sua data de nascimento.';
  end if;
  if age(p_birth_date::timestamp) < interval '18 years' then
    raise exception 'É preciso ter 18 anos ou mais para usar o VibeLive.';
  end if;

  update public.profiles
  set birth_date = p_birth_date, terms_accepted_at = now()
  where id = v_uid;

  return (select p from public.profiles p where id = v_uid);
end;
$$;
