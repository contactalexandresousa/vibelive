-- Publicar post era o único ponto sem limite de taxa nenhum — denúncia, DM,
-- chat da live e chamada já têm (0043/0060/0064). Um script com a senha de
-- alguém podia inundar o feed com centenas de posts via chamada direta à
-- API, sem passar pelo botão do app. 10/hora é generoso pro uso normal (dá
-- pra publicar um carrossel de 10 fotos e ainda sobra margem) mas barra flood.
create function public._enforce_post_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._check_and_log_rate_limit('create_post', 10, interval '1 hour');
  return new;
end;
$$;

create trigger trg_rate_limit_posts
  before insert on public.posts
  for each row execute function public._enforce_post_rate_limit();
