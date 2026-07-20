-- Antes, toda conta anônima virava "Visitante" sem nenhuma diferenciação —
-- no chat ao vivo real (0012) isso deixava todo mundo com o mesmo nome.
-- Dá um sufixo curto e único baseado no id, até a pessoa editar o próprio nome.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_suffix text := upper(substr(new.id::text, 1, 4));
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(split_part(new.email, '@', 1), 'visitante_' || substr(new.id::text, 1, 8)),
    coalesce(split_part(new.email, '@', 1), 'Visitante ' || v_suffix)
  );
  return new;
end;
$$;
