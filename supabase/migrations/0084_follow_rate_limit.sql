-- Seguir não tinha limite nenhum — e como todo follow novo dispara uma
-- notificação push pro seguido (trg_notify_new_follower, 0024/0039), um
-- script podia seguir/desseguir a mesma pessoa em loop só pra martelar
-- notificação nela. Só a INSERÇÃO é limitada (deixar de seguir uma relação
-- que já não existe é inofensivo, não precisa travar).
create function public._enforce_follow_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._check_and_log_rate_limit('follow_user', 30, interval '1 hour');
  return new;
end;
$$;

create trigger trg_rate_limit_follows
  before insert on public.follows
  for each row execute function public._enforce_follow_rate_limit();
