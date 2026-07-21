-- Até aqui, mandar presente/rosa só debitava de quem enviava — quem
-- transmite nunca recebia nada de verdade na própria carteira, mesmo com o
-- chat anunciando o presente. Agora o valor é transferido de verdade:
-- quem manda perde as moedas, quem transmite ganha exatamente o mesmo valor.

alter table public.wallet_transactions drop constraint wallet_transactions_type_check;
alter table public.wallet_transactions add constraint wallet_transactions_type_check
  check (type in (
    'gift', 'gift_received', 'quick_rose', 'quick_rose_received',
    'pk_support', 'vip_purchase', 'roulette_spin', 'daily_checkin', 'pix_recharge'
  ));

-- Credita um valor na carteira de um usuário específico (diferente de
-- _credit_coins, que só credita quem está chamando a função).
create function public._credit_coins_to(p_user_id uuid, p_amount int, p_type text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set coins = coins + p_amount where id = p_user_id;
  insert into public.wallet_transactions (user_id, amount, type, metadata)
    values (p_user_id, p_amount, p_type, p_metadata);
end;
$$;

create or replace function public.send_gift(p_gift_code text, p_broadcaster_handle text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_price int;
  v_uid uuid := auth.uid();
  v_gift_label text;
  v_username text;
  v_broadcaster_id uuid;
begin
  v_price := case p_gift_code
    when 'rosa' then 1
    when 'chocolate' then 5
    when 'diamante' then 25
    when 'coroa_vip' then 100
    when 'super_carro' then 500
    when 'castelo' then 1000
    else null
  end;
  if v_price is null then
    raise exception 'Presente inválido';
  end if;

  v_gift_label := case p_gift_code
    when 'rosa' then 'Rosa 🌹'
    when 'chocolate' then 'Chocolate 🍫'
    when 'diamante' then 'Diamante 💎'
    when 'coroa_vip' then 'Coroa VIP 👑'
    when 'super_carro' then 'Super Carro 🚗'
    when 'castelo' then 'Castelo 🏰'
  end;

  perform public._spend_coins(v_price, 'gift', jsonb_build_object('gift_code', p_gift_code, 'broadcaster', p_broadcaster_handle));

  if p_broadcaster_handle is not null then
    select id into v_broadcaster_id from public.profiles where username = p_broadcaster_handle;
    if v_broadcaster_id is not null and v_broadcaster_id <> v_uid then
      perform public._credit_coins_to(v_broadcaster_id, v_price, 'gift_received', jsonb_build_object('gift_code', p_gift_code, 'from', v_uid));
    end if;

    select coalesce(display_name, username) into v_username from public.profiles where id = v_uid;
    insert into public.live_chat_messages (broadcaster_handle, user_id, username, text, type)
      values (p_broadcaster_handle, v_uid, v_username, 'enviou ' || v_gift_label, 'gift');
  end if;

  return (select p from public.profiles p where id = v_uid);
end;
$$;

create or replace function public.send_quick_rose(p_broadcaster_handle text default null)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_username text;
  v_broadcaster_id uuid;
begin
  perform public._spend_coins(1, 'quick_rose');

  if p_broadcaster_handle is not null then
    select id into v_broadcaster_id from public.profiles where username = p_broadcaster_handle;
    if v_broadcaster_id is not null and v_broadcaster_id <> v_uid then
      perform public._credit_coins_to(v_broadcaster_id, 1, 'quick_rose_received', jsonb_build_object('from', v_uid));
    end if;

    select coalesce(display_name, username) into v_username from public.profiles where id = v_uid;
    insert into public.live_chat_messages (broadcaster_handle, user_id, username, text, type)
      values (p_broadcaster_handle, v_uid, v_username, 'enviou uma Rosa 🌹', 'gift');
  end if;

  return (select p from public.profiles p where id = v_uid);
end;
$$;
