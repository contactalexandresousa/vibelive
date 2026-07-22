-- DM, denúncia e presentes já têm limite de frequência (0043) — o chat ao
-- vivo, a superfície mais exposta (qualquer um vendo a live vê as mensagens,
-- inclusive quem não está logado), ficou de fora. Um script batendo direto
-- na API conseguia inundar o chat de qualquer live sem nenhuma trava.
-- Só limita mensagens type='chat' — as inseridas via send_gift/send_quick_rose
-- (type='gift') já rodam dentro de RPCs SECURITY DEFINER com seu próprio
-- limite, não precisam (e não devem) passar por essa trava de novo.
create function public._enforce_live_chat_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type = 'chat' then
    perform public._check_and_log_rate_limit('live_chat_message', 20, interval '30 seconds');
  end if;
  return new;
end;
$$;

create trigger trg_rate_limit_live_chat
  before insert on public.live_chat_messages
  for each row execute function public._enforce_live_chat_rate_limit();
