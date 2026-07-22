-- Só dava pra apagar uma mensagem enviada por engano (0097), não corrigir
-- um erro de digitação. Mesma janela de 15min do "apagar para todos", só
-- pra quem enviou, só mensagem de texto ainda não apagada.
alter table public.direct_messages add column edited_at timestamptz;

create function public.edit_my_message(p_message_id uuid, p_new_text text)
returns public.direct_messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.direct_messages;
  v_trimmed text := trim(p_new_text);
begin
  if v_uid is null then
    raise exception 'Não autenticado';
  end if;
  if v_trimmed is null or char_length(v_trimmed) = 0 or char_length(v_trimmed) > 1000 then
    raise exception 'Texto inválido.';
  end if;

  select * into v_msg from public.direct_messages where id = p_message_id;
  if v_msg.id is null then
    raise exception 'Mensagem não encontrada.';
  end if;
  if v_msg.sender_id <> v_uid then
    raise exception 'Só quem enviou pode editar.';
  end if;
  if v_msg.is_deleted then
    raise exception 'Não é possível editar uma mensagem apagada.';
  end if;
  if v_msg.created_at < now() - interval '15 minutes' then
    raise exception 'Só é possível editar até 15 minutos após o envio.';
  end if;

  update public.direct_messages
    set text = v_trimmed, edited_at = now()
    where id = p_message_id
    returning * into v_msg;

  return v_msg;
end;
$$;
