-- Se o texto dos Termos de Uso mudar no futuro, quem já tem conta precisa
-- ser avisado e reconfirmar — hoje terms_accepted_at só guarda UMA aceitação
-- e nunca é revisitada. Contas existentes "herdam" a versão 1 (a que já
-- aceitaram de fato quando terms_accepted_at foi gravado); da próxima vez
-- que o texto mudar de verdade, sobe CURRENT_TERMS_VERSION aqui e no
-- cliente (app.js) — só isso já dispara o modal de reaceite pra quem estiver
-- desatualizado, reaproveitando a mesma vaga usada pelo modal de idade.
alter table public.profiles add column terms_accepted_version int not null default 1;

update public.profiles set terms_accepted_version = 1 where terms_accepted_at is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_birth_date date;
  v_terms_accepted boolean;
  v_referrer_id uuid;
begin
  v_birth_date := nullif(new.raw_user_meta_data->>'birth_date', '')::date;
  v_terms_accepted := coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean, false);

  if v_birth_date is not null and age(v_birth_date::timestamp) < interval '18 years' then
    raise exception 'É preciso ter 18 anos ou mais para criar uma conta no VibeLive.';
  end if;

  select id into v_referrer_id from public.profiles
    where username = nullif(new.raw_user_meta_data->>'referred_by_username', '');

  insert into public.profiles (id, username, display_name, birth_date, terms_accepted_at, terms_accepted_version, referred_by)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'visitante_' || substr(new.id::text, 1, 8)),
    coalesce(split_part(new.email, '@', 1), 'Visitante'),
    v_birth_date,
    case when v_terms_accepted then now() else null end,
    1,
    v_referrer_id
  );
  return new;
end;
$$;

create or replace function public.verify_age_and_accept_terms(p_birth_date date)
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
  set birth_date = p_birth_date, terms_accepted_at = now(), terms_accepted_version = 1
  where id = v_uid;

  return (select p from public.profiles p where id = v_uid);
end;
$$;

-- Reaceite: usado quando só a versão dos Termos está desatualizada (idade e
-- data de nascimento já confirmadas antes, não precisa pedir de novo).
create function public.accept_terms_version(p_version int)
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
  update public.profiles
  set terms_accepted_at = now(), terms_accepted_version = p_version
  where id = v_uid;
  return (select p from public.profiles p where id = v_uid);
end;
$$;
