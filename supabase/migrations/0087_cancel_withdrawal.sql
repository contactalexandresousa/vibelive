-- Se a pessoa errar a chave PIX ou mudar de ideia, hoje não dá pra cancelar
-- um saque já enviado — fica esperando o admin revisar (que só pode
-- aprovar/rejeitar, não foi pensado pra esse caso). Deixa cancelar enquanto
-- ainda estiver pendente, devolvendo as moedas na hora — mesmo padrão de
-- estorno que review_withdrawal_request já usa pra rejeição, só com um tipo
-- de transação próprio (withdrawal_cancelled) pra não aparecer no extrato
-- como se um admin tivesse rejeitado.
alter table public.withdrawal_requests drop constraint withdrawal_requests_status_check;
alter table public.withdrawal_requests add constraint withdrawal_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'paid', 'cancelled'));

create function public.cancel_my_withdrawal_request(p_request_id uuid)
returns public.withdrawal_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.withdrawal_requests;
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_request from public.withdrawal_requests
    where id = p_request_id and user_id = v_uid for update;
  if v_request is null then
    raise exception 'Solicitação não encontrada.';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'Só é possível cancelar solicitações pendentes.';
  end if;

  update public.profiles set coins = coins + v_request.coins_amount where id = v_uid;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (v_uid, v_request.coins_amount, 'withdrawal_cancelled', jsonb_build_object('request_id', v_request.id));

  update public.withdrawal_requests
  set status = 'cancelled', reviewed_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;
