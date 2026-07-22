-- Hoje, se um usuário real tiver um problema legítimo (cobrança duplicada,
-- falha na confirmação do PIX, compensação por bug), a única forma de
-- corrigir o saldo é rodar SQL direto no banco — não existe ferramenta de
-- suporte nenhuma. p_reason é obrigatório e fica registrado tanto no ledger
-- (wallet_transactions, visível pro próprio usuário no extrato) quanto no
-- log de auditoria — nenhum ajuste acontece silenciosamente.
create function public.admin_adjust_coins(p_user_id uuid, p_amount int, p_reason text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_coins int;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if not coalesce(v_is_admin, false) then
    raise exception 'Apenas administradores podem ajustar saldo.';
  end if;
  if p_amount = 0 then
    raise exception 'Informe um valor diferente de zero.';
  end if;
  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'Informe o motivo do ajuste.';
  end if;

  select coins into v_coins from public.profiles where id = p_user_id for update;
  if v_coins is null then
    raise exception 'Usuário não encontrado.';
  end if;
  if v_coins + p_amount < 0 then
    raise exception 'O ajuste deixaria o saldo negativo (saldo atual: %).', v_coins;
  end if;

  update public.profiles set coins = coins + p_amount where id = p_user_id;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (p_user_id, p_amount, 'admin_adjustment', jsonb_build_object('reason', trim(p_reason), 'admin_id', auth.uid()));

  perform public._log_admin_action('coins_adjusted', p_user_id, jsonb_build_object('amount', p_amount, 'reason', trim(p_reason)));

  return (select p from public.profiles p where id = p_user_id);
end;
$$;
